import { useMemo, useState } from "react";
import { DATASET_EDIT_URL } from "../data/datasetSource";
import { appendMatch, NewMatchInput, replaceMatch, serializeDataset } from "../domain/addMatch";
import {
  deriveOverviewStats,
  formatNeutralScoreline,
  formatWinnerScoreline,
  isUnfinished,
  sortMatchesNewestFirst,
} from "../domain/deriveStats";
import { DeucelineDataset, Match, PlayerKey, SetScore, Surface, SURFACES, WeatherTag, WEATHER_TAGS } from "../domain/schema";
import { DatasetValidationError, validateDataset } from "../domain/validateDataset";
import { Modal } from "./Modal";
import { SurfaceBadge } from "./SurfaceBadge";
import { WEATHER_LABELS, WeatherBadges } from "./weather";

// The Cloudflare Pages Functions that commit for us (one-tap publish / update).
const PUBLISH_ENDPOINT = "/api/add-match";
const UPDATE_ENDPOINT = "/api/update-match";
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

// Seed the set-row fields from an existing match being edited (finished or not).
const setRowsFromMatch = (match?: Match): SetRowState[] => {
  if (!match || match.fidelity !== "sets") return [emptySetRow(), emptySetRow()];
  return match.sets.map((set) => ({
    alan: String(set.alan),
    opponent: String(set.opponent),
    tbAlan: set.tiebreak ? String(set.tiebreak.alan) : "",
    tbOpponent: set.tiebreak ? String(set.tiebreak.opponent) : "",
  }));
};

const tallyFromMatch = (match?: Match): Record<PlayerKey, string> =>
  match && match.fidelity === "matchScore"
    ? { alan: String(match.matchScore.alan), opponent: String(match.matchScore.opponent) }
    : { alan: "", opponent: "" };

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
  // When set, the sheet edits this existing match (used to complete an
  // unfinished one) instead of adding a new match.
  editMatch?: Match;
  // Called with the fresh dataset the server returns after a successful publish,
  // so the caller can refresh in-memory state without waiting for a redeploy.
  onPublished?: (next: DeucelineDataset) => void;
};

export function AddMatchSheet({ dataset, onClose, editMatch, onPublished }: AddMatchSheetProps) {
  const players = dataset.rivalry.players;
  const isEdit = Boolean(editMatch);
  const lastMatch = useMemo(() => sortMatchesNewestFirst(dataset.matches)[0], [dataset.matches]);
  // In edit mode seed from the match; otherwise carry the last match's context.
  const seed = editMatch ?? lastMatch;

  const [date, setDate] = useState(editMatch?.date ?? todayIso);
  const [surface, setSurface] = useState<Surface>(seed?.surface ?? "hard");
  const [location, setLocation] = useState(seed?.location ?? "");
  // Weather is per-occasion, so (unlike surface/location) it never carries over
  // from the last match — only an edited match reseeds its own recorded weather.
  const [conditions, setConditions] = useState<WeatherTag[]>(editMatch?.conditions ?? []);
  const [tempC, setTempC] = useState(editMatch?.tempC !== undefined ? String(editMatch.tempC) : "");
  const [fidelity, setFidelity] = useState<"sets" | "matchScore">(editMatch?.fidelity ?? "sets");
  // Default to Finished. The only edit entry is "Update result" on an unfinished
  // match, where the intent is to complete it — defaulting to Unfinished would
  // silently re-save it as still in progress. The toggle is there if it really is
  // still suspended.
  const [status, setStatus] = useState<"finished" | "unfinished">("finished");
  const [setRows, setSetRows] = useState<SetRowState[]>(() => setRowsFromMatch(editMatch));
  const [tally, setTally] = useState<Record<PlayerKey, string>>(() => tallyFromMatch(editMatch));
  const [notes, setNotes] = useState(editMatch?.notes ?? "");
  const [issues, setIssues] = useState<string[] | null>(null);
  const [candidate, setCandidate] = useState<DeucelineDataset | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [pendingInput, setPendingInput] = useState<NewMatchInput | null>(null);
  const [password, setPassword] = useState(readStoredPassword);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "done">("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  // Whether the committed dataset was successfully applied to local state, so the
  // "done" message doesn't promise an instant refresh that didn't happen.
  const [refreshed, setRefreshed] = useState(false);

  const updateSetRow = (index: number, patch: Partial<SetRowState>) => {
    setSetRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const toggleCondition = (tag: WeatherTag) =>
    setConditions((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const buildInput = (): NewMatchInput => {
    // Blank temp → not recorded; a non-empty but unparseable value becomes NaN so
    // validateDataset rejects it loudly rather than silently discarding it.
    const tempValue = tempC.trim() === "" ? undefined : Number(tempC);
    const shared = {
      date,
      surface,
      location,
      conditions,
      ...(tempValue !== undefined ? { tempC: tempValue } : {}),
      notes,
      ...(status === "unfinished" ? { status } : {}),
    } as const;
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
      // Edit mode replaces the match in place; add mode appends. Both re-validate.
      const nextDataset = editMatch ? replaceMatch(dataset, editMatch.id, input) : appendMatch(dataset, input);
      setCandidate(validateDataset(nextDataset));
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

  // One-tap publish: send only the new/updated match to the Cloudflare Function,
  // which re-appends (or replaces an unfinished match) + re-validates server-side
  // and commits. The whole domain flow (validate → review) already ran; this just
  // replaces the manual hand-off.
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
      const response = await fetch(isEdit ? UPDATE_ENDPOINT : PUBLISH_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-deuceline-key": key },
        body: JSON.stringify(isEdit ? { id: editMatch!.id, match: pendingInput } : { match: pendingInput }),
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

      // Refresh in-memory state from the server's fresh dataset so the UI updates
      // immediately (no wait for the redeploy). The commit already succeeded, so a
      // malformed/invalid body must not error the flow (that would risk a
      // duplicate re-submit) — we just fall back to a "reload to refresh" message.
      const payload = (await response.json().catch(() => null)) as { dataset?: unknown } | null;
      let didRefresh = false;
      if (payload?.dataset && onPublished) {
        try {
          onPublished(validateDataset(payload.dataset));
          didRefresh = true;
        } catch {
          didRefresh = false;
        }
      }

      storePassword(key);
      setNeedsPassword(false);
      setRefreshed(didRefresh);
      setPublishState("done");
    } catch {
      setPublishState("idle");
      setPublishError("Couldn't reach the publisher. You can still commit on GitHub below.");
    }
  };

  if (candidate) {
    // In edit mode the replaced match keeps its id; in add mode it's the last one.
    const newMatch = editMatch
      ? candidate.matches.find((match) => match.id === editMatch.id)!
      : candidate.matches[candidate.matches.length - 1];
    const unfinished = isUnfinished(newMatch);
    const record = deriveOverviewStats(candidate.matches).matchRecord;
    const neutral = unfinished ? formatNeutralScoreline(newMatch) : null;
    const scoreline = unfinished ? null : formatWinnerScoreline(newMatch);

    return (
      <Modal titleId="addMatchTitle" eyebrow={isEdit ? "Update match · Review" : "Add match · Review"} title="Looks right?" onClose={onClose}>
        <div className="review-result">
          {unfinished && neutral ? (
            <>
              <p className="review-headline">
                In progress · {players.alan.displayName} {neutral.alan}—{neutral.opponent} {players.opponent.displayName}
              </p>
              {neutral.setScores ? <p className="set-line">{neutral.setScores.join("   ")}</p> : null}
            </>
          ) : (
            <>
              <p className="review-headline">
                {players[scoreline!.winner].displayName} won {scoreline!.score}
              </p>
              {scoreline!.setScores ? <p className="set-line">{scoreline!.setScores.join("   ")}</p> : null}
            </>
          )}
          <p className="review-meta">
            <SurfaceBadge surface={newMatch.surface} />
            {newMatch.location ? <span>{newMatch.location}</span> : null}
            {newMatch.date ? <span>{newMatch.date}</span> : null}
            <WeatherBadges conditions={newMatch.conditions} tempC={newMatch.tempC} />
          </p>
          <p className="review-h2h">
            {unfinished ? "H2H unchanged — counts once finished" : `H2H becomes ${record.alan}—${record.opponent}`}
          </p>
        </div>

        {publishState === "done" ? (
          <>
            <p className="review-copied">
              {refreshed
                ? "Published ✓ — updated here, and live on the site in about a minute."
                : "Published ✓ — live on the site in about a minute. Reload to see it here."}
            </p>
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
    <Modal
      titleId="addMatchTitle"
      eyebrow={isEdit ? "Update match" : "Add match"}
      title={`Match ${editMatch?.seq ?? (lastMatch?.seq ?? 0) + 1}`}
      onClose={onClose}
    >
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
          <span className="field-label">Conditions (optional)</span>
          <div className="chip-row" role="group" aria-label="Weather conditions">
            {WEATHER_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={conditions.includes(tag)}
                className={`chip ${conditions.includes(tag) ? "chip-active" : ""}`}
                onClick={() => toggleCondition(tag)}
              >
                {WEATHER_LABELS[tag]}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Temperature (optional)</span>
          <div className="temp-input">
            <input
              className="text-input"
              type="number"
              inputMode="numeric"
              value={tempC}
              placeholder="e.g. 24"
              onChange={(event) => setTempC(event.target.value)}
              aria-label="Temperature in degrees Celsius"
            />
            <span className="temp-unit" aria-hidden="true">
              °C
            </span>
          </div>
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
          <span className="field-label">Result</span>
          <div className="segmented" role="radiogroup" aria-label="Result">
            <button
              type="button"
              role="radio"
              aria-checked={status === "finished"}
              className={`segment ${status === "finished" ? "segment-active" : ""}`}
              onClick={() => setStatus("finished")}
            >
              Finished
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={status === "unfinished"}
              className={`segment ${status === "unfinished" ? "segment-active" : ""}`}
              onClick={() => setStatus("unfinished")}
            >
              Unfinished
            </button>
          </div>
          {status === "unfinished" ? (
            <p className="field-hint">No winner yet — a tied score is allowed. It won't count in stats until you finish it.</p>
          ) : null}
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
