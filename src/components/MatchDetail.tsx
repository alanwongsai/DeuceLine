import {
  deriveMatchContext,
  deriveMatchResult,
  deriveSetWinner,
  formatNeutralScoreline,
  formatWinnerScoreline,
  isUnfinished,
} from "../domain/deriveStats";
import { Match, Player, PlayerKey } from "../domain/schema";
import { Modal } from "./Modal";
import { SurfaceBadge } from "./SurfaceBadge";

type MatchDetailProps = {
  match: Match;
  players: Record<PlayerKey, Player>;
  matches: Match[];
  onClose: () => void;
  // Present when this match can be updated (i.e. it is unfinished) — opens the
  // edit form to record the final result.
  onUpdate?: () => void;
};

export function MatchDetail({ match, players, matches, onClose, onUpdate }: MatchDetailProps) {
  if (isUnfinished(match)) {
    return <UnfinishedDetail match={match} players={players} onClose={onClose} onUpdate={onUpdate} />;
  }

  const result = deriveMatchResult(match);
  const scoreline = formatWinnerScoreline(match);
  const context = deriveMatchContext(matches, match.id);
  // Finished match: winner is always known.
  const winner = players[result.winner as PlayerKey];

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
      eyebrow={match.date ? formatDate(match.date) : `Match ${match.seq}`}
      title={
        <>
          {winner.displayName} won {scoreline.score}
        </>
      }
      onClose={onClose}
    >
      <div className="detail-meta">
        <SurfaceBadge surface={match.surface} />
        {match.location ? <span>{match.location}</span> : null}
      </div>

      {match.fidelity === "sets" ? (
        <SetList match={match} players={players} />
      ) : (
        <p className="set-line set-line-missing">
          Set scores not recorded · final {scoreline.score}
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
        <p className="detail-sub">
          Match {context.matchNumber} of {context.totalMatches}
        </p>
        {narrative.map((line) => (
          <p className="detail-sub" key={line}>
            {line}
          </p>
        ))}
      </div>
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
}: Omit<MatchDetailProps, "matches">) {
  const neutral = formatNeutralScoreline(match);

  return (
    <Modal
      titleId="matchDetailTitle"
      eyebrow={match.date ? formatDate(match.date) : `Match ${match.seq}`}
      title={
        <>
          In progress · {neutral.alan}—{neutral.opponent}
        </>
      }
      onClose={onClose}
    >
      <div className="detail-meta">
        <span className="status-pill">In progress</span>
        <SurfaceBadge surface={match.surface} />
        {match.location ? <span>{match.location}</span> : null}
      </div>

      {match.fidelity === "sets" ? (
        <SetList match={match} players={players} />
      ) : (
        <p className="set-line set-line-missing">
          Set scores not recorded · {neutral.alan}—{neutral.opponent} so far
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
    </Modal>
  );
}

// Per-set list with the set winner's games in their identity colour. For an
// unfinished match this still reads correctly set by set.
function SetList({ match, players }: { match: Extract<Match, { fidelity: "sets" }>; players: Record<PlayerKey, Player> }) {
  return (
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
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
