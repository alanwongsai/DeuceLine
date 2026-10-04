import { identityTextStyle } from "./identityStyle";
import { useRef } from "react";
import {
  deriveMatchContext,
  deriveMatchResult,
  deriveTimeline,
  formatNeutralScoreline,
  formatWinnerScoreline,
  isUnfinished,
  matchGamesTally,
} from "../domain/deriveStats";
import { Match, Player, PlayerKey, PointScore } from "../domain/schema";
import { Modal } from "./Modal";
import { LeadSparkline } from "./LeadSparkline";
import { PlayerComparison } from "./PlayerComparison";
import { SurfaceBadge } from "./SurfaceBadge";
import { WeatherBadges } from "./weather";

type MatchDetailProps = {
  match: Match;
  players: Record<PlayerKey, Player>;
  matches: Match[];
  onClose: () => void;
  // Present when this match can be updated (i.e. it is unfinished) — opens the
  // edit form to record the final result.
  onUpdate?: () => void;
  onSelectMatch?: (match: Match) => void;
};

export function MatchDetail({ match, players, matches, onClose, onUpdate, onSelectMatch }: MatchDetailProps) {
  const ordered = [...matches].sort((a, b) => a.seq - b.seq);
  const position = ordered.findIndex((candidate) => candidate.id === match.id);
  const previous = position > 0 ? ordered[position - 1] : null;
  const next = position >= 0 && position < ordered.length - 1 ? ordered[position + 1] : null;

  if (isUnfinished(match)) {
    return <UnfinishedDetail match={match} players={players} onClose={onClose} onUpdate={onUpdate} onSelectMatch={onSelectMatch} previous={previous} next={next} />;
  }

  const result = deriveMatchResult(match);
  const scoreline = formatWinnerScoreline(match);
  const context = deriveMatchContext(matches, match.id);
  // Finished match: winner is always known.
  const winner = players[result.winner as PlayerKey];
  const games = match.fidelity === "sets" ? matchGamesTally(match) : null;

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
    <Modal
      titleId="matchDetailTitle"
      eyebrow={match.date ? `${formatDate(match.date)} · Match ${match.seq}` : `Match ${match.seq} · Date unknown`}
      title={
        <>
          <span style={identityTextStyle(scoreline.winner)}>{winner.displayName}</span> won <span style={identityTextStyle(scoreline.winner)}>{scoreline.score}</span>
        </>
      }
      onClose={onClose}
    >
      <div className="detail-meta">
        <SurfaceBadge surface={match.surface} />
        <span>{match.location ?? "Location unknown"}</span>
        <span className={`fidelity-label ${match.fidelity === "sets" ? "fidelity-detailed" : "fidelity-summary"}`}>
          {match.fidelity === "sets" ? "Full set scores" : "Score summary"}
        </span>
        <WeatherBadges conditions={match.conditions} tempC={match.tempC} />
      </div>

      {match.fidelity === "sets" ? (
        <SetList match={match} players={players} />
      ) : (
        <p className="set-line set-line-missing">
          Score summary only · final set tally {scoreline.score}
        </p>
      )}

      {match.notes ? <p className="match-notes">{match.notes}</p> : null}

      <div className="detail-impact">
        <p className="eyebrow">Rivalry impact</p>
        <p className="detail-h2h">
          <span style={identityTextStyle("alan")}>
            {players.alan.displayName} {context.recordAfter.alan}
          </span>
          <i aria-hidden="true"> — </i>
          <span style={identityTextStyle("opponent")}>
            {context.recordAfter.opponent} {players.opponent.displayName}
          </span>
        </p>
        <p className="detail-sub">
          Decided match {context.matchNumber} of {context.totalMatches}
        </p>
        {narrative.map((line) => (
          <p className="detail-sub" key={line}>
            {line}
          </p>
        ))}
        <LeadSparkline
          timeline={deriveTimeline(matches)}
          matches={matches}
          players={players}
          highlightMatchId={match.id}
          interactive={false}
          ariaLabel={`Rivalry lead after match ${match.seq}`}
        />
        {games ? <p className="detail-games">Known games · <PlayerComparison alan={`${players.alan.displayName} ${games.alan}`} opponent={`${games.opponent} ${players.opponent.displayName}`} /></p> : null}
      </div>

      <MatchPager previous={previous} next={next} onSelectMatch={onSelectMatch} />
    </Modal>
  );
}

// Detail view for an unfinished match: no winner, no rivalry impact yet, and a
// call to action to record the final result.
function UnfinishedDetail({
  match,
  players,
  onClose,
  onUpdate,
  onSelectMatch,
  previous,
  next,
}: Omit<MatchDetailProps, "matches"> & { previous: Match | null; next: Match | null }) {
  const neutral = formatNeutralScoreline(match);

  return (
    <Modal
      titleId="matchDetailTitle"
      eyebrow={match.date ? `${formatDate(match.date)} · Match ${match.seq}` : `Match ${match.seq} · Date unknown`}
      title={
        <>
          In progress · <PlayerComparison alan={neutral.alan} opponent={neutral.opponent} />
        </>
      }
      onClose={onClose}
    >
      <div className="detail-meta">
        <span className="status-pill">In progress</span>
        <SurfaceBadge surface={match.surface} />
        <span>{match.location ?? "Location unknown"}</span>
        <span className={`fidelity-label ${match.fidelity === "sets" ? "fidelity-detailed" : "fidelity-summary"}`}>
          {match.fidelity === "sets" ? "Full set scores" : "Score summary"}
        </span>
        <WeatherBadges conditions={match.conditions} tempC={match.tempC} />
      </div>

      {match.fidelity === "sets" ? (
        <SetList match={match} players={players} />
      ) : (
        <p className="set-line set-line-missing">
          Score summary only · set tally <PlayerComparison alan={neutral.alan} opponent={neutral.opponent} /> so far
        </p>
      )}

      {match.notes ? <p className="match-notes">{match.notes}</p> : null}

      <div className="detail-impact">
        <p className="eyebrow">Rivalry impact</p>
        <p className="detail-sub">This match is still in progress — it won't count in the record until it's finished.</p>
      </div>

      {onUpdate ? (
        <button className="primary-button" type="button" onClick={onUpdate}>
          Update result
        </button>
      ) : null}

      <MatchPager previous={previous} next={next} onSelectMatch={onSelectMatch} />
    </Modal>
  );
}

function MatchPager({
  previous,
  next,
  onSelectMatch,
}: {
  previous: Match | null;
  next: Match | null;
  onSelectMatch?: (match: Match) => void;
}) {
  const previousButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  if (!onSelectMatch || (!previous && !next)) return null;

  const selectMatch = (target: Match, direction: "previous" | "next") => {
    onSelectMatch(target);
    window.requestAnimationFrame(() => {
      const sameDirection = direction === "previous" ? previousButtonRef.current : nextButtonRef.current;
      const otherDirection = direction === "previous" ? nextButtonRef.current : previousButtonRef.current;
      if (sameDirection && !sameDirection.disabled) sameDirection.focus();
      else if (otherDirection && !otherDirection.disabled) otherDirection.focus();
    });
  };

  return (
    <div className="detail-pagination" aria-label="Browse matches">
      <button ref={previousButtonRef} type="button" disabled={!previous} onClick={() => previous && selectMatch(previous, "previous")}>
        <img className="pagination-chevron pagination-chevron-previous" src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" />
        Previous
      </button>
      <button ref={nextButtonRef} type="button" disabled={!next} onClick={() => next && selectMatch(next, "next")}>
        Next
        <img className="pagination-chevron" src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" />
      </button>
    </div>
  );
}

// Per-set comparisons always use Alan-left / Andy-right identity colours,
// including unfinished sets. Winning and completion rules remain in the domain.
function SetList({ match, players }: { match: Extract<Match, { fidelity: "sets" }>; players: Record<PlayerKey, Player> }) {
  return (
    <div className="detail-set-table">
      <div className="detail-set-legend" aria-label={`Set score order: ${players.alan.displayName}, then ${players.opponent.displayName}`}>
        <span>Set</span>
        <strong><b style={identityTextStyle("alan")}>{players.alan.displayName}</b><i>—</i><b style={identityTextStyle("opponent")}>{players.opponent.displayName}</b></strong>
      </div>
      <ol className="detail-sets">
        {match.sets.map((set, index) => {
          return (
            <li key={index} aria-label={`Set ${index + 1}: ${players.alan.displayName} ${set.alan}, ${players.opponent.displayName} ${set.opponent}`}>
              <span className="detail-set-label">Set {index + 1}</span>
              <span className="detail-set-score">
                <b style={identityTextStyle("alan")}>{set.alan}</b>
                <i aria-hidden="true">–</i>
                <b style={identityTextStyle("opponent")}>{set.opponent}</b>
                {set.tiebreak ? (
                  <em>
                    ({set.tiebreak.alan}-{set.tiebreak.opponent})
                  </em>
                ) : null}
              </span>
            </li>
          );
        })}
        {match.matchTiebreak ? <MatchTiebreakRow points={match.matchTiebreak} players={players} /> : null}
      </ol>
    </div>
  );
}

// The Laver Cup decider: points, not games, so the score reads in brackets.
function MatchTiebreakRow({ points, players }: { points: PointScore; players: Record<PlayerKey, Player> }) {
  return (
    <li aria-label={`Match tiebreak: ${players.alan.displayName} ${points.alan}, ${players.opponent.displayName} ${points.opponent}`}>
      <span className="detail-set-label">Match TB</span>
      <span className="detail-set-score">
        <i aria-hidden="true">[</i>
        <b style={identityTextStyle("alan")}>{points.alan}</b>
        <i aria-hidden="true">–</i>
        <b style={identityTextStyle("opponent")}>{points.opponent}</b>
        <i aria-hidden="true">]</i>
      </span>
    </li>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
