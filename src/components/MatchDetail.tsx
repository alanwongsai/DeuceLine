import { useEffect, useRef } from "react";
import { deriveMatchContext, deriveMatchResult, deriveSetWinner, formatMatchScore } from "../domain/deriveStats";
import { Match, Player, PlayerKey } from "../domain/schema";
import { SurfaceBadge } from "./SurfaceBadge";

type MatchDetailProps = {
  match: Match;
  players: Record<PlayerKey, Player>;
  matches: Match[];
  onClose: () => void;
};

export function MatchDetail({ match, players, matches, onClose }: MatchDetailProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const result = deriveMatchResult(match);
  const context = deriveMatchContext(matches, match.id);
  const winner = players[result.winner];

  useEffect(() => {
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const narrative: string[] = [];
  if (context.snappedStreak) {
    narrative.push(`Snapped ${players[context.snappedStreak.player].displayName}'s ${context.snappedStreak.count}-match streak.`);
  }
  if (context.streakAfter.count >= 2) {
    narrative.push(`${winner.displayName} extended their run to ${context.streakAfter.count} straight.`);
  }
  if (narrative.length === 0) {
    narrative.push(
      context.matchNumber === 1
        ? "First match of the rivalry."
        : `${winner.displayName} took it straight back after the last result.`,
    );
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="matchDetailTitle"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{match.date ? formatDate(match.date) : `Match ${match.seq}`}</p>
            <h2 id="matchDetailTitle">
              {winner.displayName} won {formatMatchScore(match)}
            </h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Close match detail">
            ×
          </button>
        </div>

        <div className="detail-meta">
          <SurfaceBadge surface={match.surface} />
          {match.location ? <span>{match.location}</span> : null}
        </div>

        {match.fidelity === "sets" ? (
          <ol className="detail-sets">
            {match.sets.map((set, index) => {
              const setWinner = deriveSetWinner(set);
              return (
                <li key={index}>
                  <span className="detail-set-label">Set {index + 1}</span>
                  <span className="detail-set-score">
                    <b style={{ color: setWinner === "alan" ? players.alan.color : undefined }}>{set.alan}</b>
                    <i aria-hidden="true">–</i>
                    <b style={{ color: setWinner === "opponent" ? players.opponent.color : undefined }}>{set.opponent}</b>
                    {set.tiebreak ? (
                      <em>
                        ({set.tiebreak.alan}-{set.tiebreak.opponent})
                      </em>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="set-line set-line-missing">
            Set scores not recorded · final {match.matchScore.alan}—{match.matchScore.opponent}
          </p>
        )}

        {match.notes ? <p className="match-notes">{match.notes}</p> : null}

        <div className="detail-impact">
          <p className="eyebrow">Rivalry impact</p>
          <p className="detail-h2h">
            <span style={{ color: players.alan.color }}>
              {players.alan.displayName} {context.recordAfter.alan}
            </span>
            <i aria-hidden="true"> — </i>
            <span style={{ color: players.opponent.color }}>
              {context.recordAfter.opponent} {players.opponent.displayName}
            </span>
          </p>
          <p className="detail-sub">Match {context.matchNumber} of {context.totalMatches}</p>
          {narrative.map((line) => (
            <p className="detail-sub" key={line}>
              {line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
