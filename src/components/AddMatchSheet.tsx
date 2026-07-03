import { useMemo, useState } from "react";
import { DATASET_EDIT_URL } from "../data/datasetSource";
import { appendMatch, NewMatchInput, serializeDataset } from "../domain/addMatch";
import { deriveOverviewStats, formatWinnerScoreline, sortMatchesNewestFirst } from "../domain/deriveStats";
import { DeucelineDataset, PlayerKey, SetScore, Surface, SURFACES } from "../domain/schema";
import { DatasetValidationError, validateDataset } from "../domain/validateDataset";
import { Modal } from "./Modal";
import { SurfaceBadge } from "./SurfaceBadge";

// The Cloudflare Pages Function that commits the match for us (one-tap publish).
const PUBLISH_ENDPOINT = "/api/add-match";
// The publish password is stored on this device only — never in the bundle — so
// a visitor with just the link can't reach the write path. It's a credential,
// not canonical data, so localStorage is fine here (see AGENTS.md).
const PASSWORD_KEY = "deuceline.addMatchKey";

function readStoredPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

function storePassword(value: string): void {
  try {
    localStorage.setItem(PASSWORD_KEY, value);
  } catch {
    /* localStorage may be unavailable (private mode); the GitHub-editor fallback still works. */
  }
}

function clearStoredPassword(): void {
  try {
    localStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* ignore */
  }
}

const surfaceLabels: Record<Surface, string> = {
  hard: "Hard",
  clay: "Clay",
  grass: "Grass",
  astro: "Astro",
};

// One set row of raw text-field values; empty rows are ignored on review so a
// spare row never blocks submission.
type SetRowState = { alan: string; opponent: string; tbAlan: string; tbOpponent: string };

const emptySetRow = (): SetRowState => ({ alan: "", opponent: "", tbAlan: "", tbOpponent: "" });

// Empty string means "not entered" — Number("") is 0, which would silently
// invent a score, so map it to NaN and let validateDataset reject it loudly.
const parseScore = (value: string): number => (value.trim() === "" ? Number.NaN : Number(value));

const isTiebreakScore = (a: string, b: string) =>
  (parseScore(a) === 7 && parseScore(b) === 6) || (parseScore(a) === 6 && parseScore(b) === 7);

function todayIso(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

type AddMatchSheetProps = {
  dataset: DeucelineDataset;
  onClose: () => void;
};

export function AddMatchSheet({ dataset, onClose }: AddMatchSheetProps) {
  const players = dataset.rivalry.players;
  const lastMatch = useMemo(() => sortMatchesNewestFirst(dataset.matches)[0], [dataset.matches]);

  const [date, setDate] = useState(todayIso);
  const [surface, setSurface] = useState<Surface>(lastMatch?.surface ?? "hard");
  const [location, setLocation] = useState(lastMatch?.location ?? "");
  const [fidelity, setFidelity] = useState<"sets" | "matchScore">("sets");
  const [setRows, setSetRows] = useState<SetRowState[]>([emptySetRow(), emptySetRow()]);
  const [tally, setTally] = useState<Record<PlayerKey, string>>({ alan: "", opponent: "" });
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState<string[] | null>(null);
  const [candidate, setCandidate] = useState<DeucelineDataset | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [pendingInput, setPendingInput] = useState<NewMatchInput | null>(null);
  const [password, setPassword] = useState(readStoredPassword);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "done">("idle");
  const [publishError, setPublishError] = useState<string | null>(null);

  const updateSetRow = (index: number, patch: Partial<SetRowState>) => {
    setSetRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const buildInput = (): NewMatchInput => {
    const shared = { date, surface, location, notes };
    if (fidelity === "matchScore") {
      return {
        ...shared,
        fidelity,
        matchScore: { alan: parseScore(tally.alan), opponent: parseScore(tally.opponent) },
      };
    }
    const sets: SetScore[] = setRows
      .filter((row) => row.alan.trim() !== "" || row.opponent.trim() !== "")
      .map((row) => ({
        alan: parseScore(row.alan),
        opponent: parseScore(row.opponent),
        ...(isTiebreakScore(row.alan, row.opponent) && row.tbAlan.trim() !== "" && row.tbOpponent.trim() !== ""
          ? { tiebreak: { alan: parseScore(row.tbAlan), opponent: parseScore(row.tbOpponent) } }
          : {}),
      }));
    return { ...shared, fidelity, sets };
  };

  const onReview = () => {
    try {
      const input = buildInput();
      setCandidate(validateDataset(appendMatch(dataset, input)));
      setPendingInput(input);
      setIssues(null);
      setCopied(false);
      setCopyFailed(false);
      setPublishState("idle");
      setPublishError(null);
      // Reveal the password field on review only if we don't already have one.
      setNeedsPassword(!password.trim());
    } catch (reason: unknown) {
      setIssues(reason instanceof DatasetValidationError ? reason.issues : ["Could not build the match."]);
    }
  };

  const onCopyAndOpen = async () => {
    if (!candidate) return;
    try {
      await navigator.clipboard.writeText(serializeDataset(candidate));
      setCopied(true);
    } catch {
      setCopyFailed(true);
    }
    window.open(DATASET_EDIT_URL, "_blank", "noopener");
  };

  // One-tap publish: send only the new match to the Cloudflare Function, which
  // re-appends + re-validates server-side and commits. The whole domain flow
  // (validate → review) already ran; this just replaces the manual hand-off.
  const onSubmit = async () => {
    if (!pendingInput) return;
    const key = password.trim();
    if (!key) {
      setNeedsPassword(true);
      return;
    }

    setPublishState("publishing");
    setPublishError(null);
    try {
      const response = await fetch(PUBLISH_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-deuceline-key": key },
        body: JSON.stringify({ match: pendingInput }),
      });

      if (response.status === 401) {
        clearStoredPassword();
        setNeedsPassword(true);
        setPublishState("idle");
        setPublishError("That password was rejected. Re-enter it and try again.");
        return;
      }
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        setPublishState("idle");
        setPublishError(detail?.error ?? `Publish failed (${response.status}). You can still commit on GitHub below.`);
        return;
      }

      storePassword(key);
      setNeedsPassword(false);
      setPublishState("done");
    } catch {
      setPublishState("idle");
      setPublishError("Couldn't reach the publisher. You can still commit on GitHub below.");
    }
  };

  if (candidate) {
    const newMatch = candidate.matches[candidate.matches.length - 1];
    const scoreline = formatWinnerScoreline(newMatch);
    const record = deriveOverviewStats(candidate.matches).matchRecord;

    return (
      <Modal titleId="addMatchTitle" eyebrow="Add match · Review" title="Looks right?" onClose={onClose}>
        <div className="review-result">
          <p className="review-headline">
            {players[scoreline.winner].displayName} won {scoreline.score}
          </p>
          {scoreline.setScores ? <p className="set-line">{scoreline.setScores.join("   ")}</p> : null}
          <p className="review-meta">
            <SurfaceBadge surface={newMatch.surface} />
            {newMatch.location ? <span>{newMatch.location}</span> : null}
            {newMatch.date ? <span>{newMatch.date}</span> : null}
          </p>
          <p className="review-h2h">
            H2H becomes {record.alan}—{record.opponent}
          </p>
        </div>

        {publishState === "done" ? (
          <>
            <p className="review-copied">Published ✓ — the site updates in about a minute.</p>
            <button className="primary-button" type="button" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <p className="review-steps">
              Submit publishes this match straight to the site — it commits for you and the site
              redeploys itself.
            </p>

            {needsPassword ? (
              <label className="field">
                <span className="field-label">Publish password</span>
                <input
                  className="text-input"
                  type="password"
                  value={password}
                  autoComplete="off"
                  placeholder="Entered once, then remembered on this device"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            ) : null}

            {publishError ? (
              <p className="publish-error" role="alert">
                {publishError}
              </p>
            ) : null}

            <button
              className="primary-button"
              type="button"
              onClick={onSubmit}
              disabled={publishState === "publishing"}
            >
              {publishState === "publishing" ? "Publishing…" : "Submit & publish"}
            </button>

            <details className="publish-fallback" open={publishError !== null}>
              <summary>Or commit on GitHub yourself</summary>
              <p className="review-steps">
                Copies the updated file and opens the GitHub editor: select all, paste, commit.
              </p>
              {copied ? <p className="review-copied">Copied — paste over the whole file, then commit.</p> : null}
              {copyFailed ? (
                <textarea
                  className="json-fallback"
                  readOnly
                  value={serializeDataset(candidate)}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Updated dataset JSON — copy manually"
                />
              ) : null}
              <button className="secondary-button" type="button" onClick={onCopyAndOpen}>
                {copied ? "Open GitHub editor again" : "Copy JSON & open GitHub"}
              </button>
            </details>

            <button className="secondary-button" type="button" onClick={() => setCandidate(null)}>
              Back to edit
            </button>
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal titleId="addMatchTitle" eyebrow="Add match" title={`Match ${(lastMatch?.seq ?? 0) + 1}`} onClose={onClose}>
      <div className="add-form">
        <label className="field">
          <span className="field-label">Date</span>
          <input className="text-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>

        <div className="field">
          <span className="field-label">Surface</span>
          <div className="segmented" role="radiogroup" aria-label="Surface">
            {SURFACES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={surface === option}
                className={`segment ${surface === option ? "segment-active" : ""}`}
                onClick={() => setSurface(option)}
              >
                {surfaceLabels[option]}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Location</span>
          <input
            className="text-input"
            type="text"
            value={location}
            placeholder="Bishop"
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label">Score detail</span>
          <div className="segmented" role="radiogroup" aria-label="Score detail">
            <button
              type="button"
              role="radio"
              aria-checked={fidelity === "sets"}
              className={`segment ${fidelity === "sets" ? "segment-active" : ""}`}
              onClick={() => setFidelity("sets")}
            >
              Full set scores
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={fidelity === "matchScore"}
              className={`segment ${fidelity === "matchScore" ? "segment-active" : ""}`}
              onClick={() => setFidelity("matchScore")}
            >
              Sets tally only
            </button>
          </div>
        </div>

        <div className="field">
          <div className="score-head" aria-hidden="true">
            <span style={{ color: players.alan.color }}>{players.alan.displayName}</span>
            <span style={{ color: players.opponent.color }}>{players.opponent.displayName}</span>
          </div>

          {fidelity === "sets" ? (
            <>
              {setRows.map((row, index) => (
                <div key={index}>
                  <div className="set-input-row">
                    <span className="field-label">Set {index + 1}</span>
                    <input
                      className="num-input"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={row.alan}
                      onChange={(event) => updateSetRow(index, { alan: event.target.value })}
                      aria-label={`Set ${index + 1} games — ${players.alan.displayName}`}
                    />
                    <input
                      className="num-input"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={row.opponent}
                      onChange={(event) => updateSetRow(index, { opponent: event.target.value })}
                      aria-label={`Set ${index + 1} games — ${players.opponent.displayName}`}
                    />
                  </div>
                  {isTiebreakScore(row.alan, row.opponent) ? (
                    <div className="set-input-row set-input-tiebreak">
                      <span className="field-label">Tiebreak</span>
                      <input
                        className="num-input"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={row.tbAlan}
                        onChange={(event) => updateSetRow(index, { tbAlan: event.target.value })}
                        aria-label={`Set ${index + 1} tiebreak points — ${players.alan.displayName}`}
                      />
                      <input
                        className="num-input"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={row.tbOpponent}
                        onChange={(event) => updateSetRow(index, { tbOpponent: event.target.value })}
                        aria-label={`Set ${index + 1} tiebreak points — ${players.opponent.displayName}`}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
              {setRows.length < 5 ? (
                <button className="add-set-button" type="button" onClick={() => setSetRows((rows) => [...rows, emptySetRow()])}>
                  + Add set
                </button>
              ) : null}
            </>
          ) : (
            <div className="set-input-row">
              <span className="field-label">Sets won</span>
              <input
                className="num-input"
                type="number"
                inputMode="numeric"
                min="0"
                value={tally.alan}
                onChange={(event) => setTally((prev) => ({ ...prev, alan: event.target.value }))}
                aria-label={`Sets won — ${players.alan.displayName}`}
              />
              <input
                className="num-input"
                type="number"
                inputMode="numeric"
                min="0"
                value={tally.opponent}
                onChange={(event) => setTally((prev) => ({ ...prev, opponent: event.target.value }))}
                aria-label={`Sets won — ${players.opponent.displayName}`}
              />
            </div>
          )}
        </div>

        <label className="field">
          <span className="field-label">Notes (optional)</span>
          <input
            className="text-input"
            type="text"
            value={notes}
            placeholder="Windy day, new racket…"
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {issues ? (
          <ul className="issue-list" aria-label="Problems with this match">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}

        <button className="primary-button" type="button" onClick={onReview}>
          Review match
        </button>
      </div>
    </Modal>
  );
}
