import { formatNeutralScoreline, formatWinnerScoreline, isUnfinished } from "../domain/deriveStats";
import { Match, Player, PlayerKey } from "../domain/schema";
import { SurfaceBadge } from "./SurfaceBadge";

type MatchCardProps = {
  match: Match;
  players: Record<PlayerKey, Player>;
  onOpen: () => void;
};

export function MatchCard({ match, players, onOpen }: MatchCardProps) {
  if (isUnfinished(match)) {
    return <UnfinishedCard match={match} players={players} onOpen={onOpen} />;
  }

  const scoreline = formatWinnerScoreline(match);
  const winner = players[scoreline.winner];

  return (
    <button
      type="button"
      className="match-card"
      onClick={onOpen}
      aria-label={`${winner.displayName} won ${scoreline.score} — open match detail`}
    >
      <div className="match-card-stripe" aria-hidden="true" style={{ background: winner.color }} />
      <div className="match-card-body">
        <div className="match-card-top">
          {match.date ? (
            <time dateTime={match.date}>{formatDate(match.date)}</time>
          ) : (
            <span className="match-seq">Match {match.seq} · Date unknown</span>
          )}
          <SurfaceBadge surface={match.surface} />
        </div>
        <h2>
          {winner.displayName} won {scoreline.score}
        </h2>
        {scoreline.setScores ? (
          <p className="set-line">{scoreline.setScores.join("   ")}</p>
        ) : (
          <p className="set-line set-line-missing">{scoreline.score} final · summary only</p>
        )}
        {match.location ? <p className="match-meta">{match.location}</p> : null}
        {match.notes ? <p className="match-notes">{match.notes}</p> : null}
      </div>
      <span className="match-card-chevron" aria-hidden="true">›</span>
    </button>
  );
}

// An unfinished match has no winner, so it can't be coloured by winner. The 6px
// edge stripe is too thin to split left/right legibly, so it splits top/bottom
// (Alan over Andy); the score itself reads Alan-left / Andy-right with each name
// in its own colour, and an "In progress" tag makes the no-winner state explicit.
function UnfinishedCard({ match, players, onOpen }: MatchCardProps) {
  const neutral = formatNeutralScoreline(match);
  const splitStripe = `linear-gradient(180deg, ${players.alan.color} 0 50%, ${players.opponent.color} 50% 100%)`;

  return (
    <button
      type="button"
      className="match-card match-card-unfinished"
      onClick={onOpen}
      aria-label={`In progress, ${neutral.alan}–${neutral.opponent} — open match detail`}
    >
      <div className="match-card-stripe" aria-hidden="true" style={{ background: splitStripe }} />
      <div className="match-card-body">
        <div className="match-card-top">
          {match.date ? (
            <time dateTime={match.date}>{formatDate(match.date)}</time>
          ) : (
            <span className="match-seq">Match {match.seq} · Date unknown</span>
          )}
          <span className="status-pill">In progress</span>
          <SurfaceBadge surface={match.surface} />
        </div>
        <h2>
          <span style={{ color: players.alan.color }}>{players.alan.displayName}</span> {neutral.alan}—{neutral.opponent}{" "}
          <span style={{ color: players.opponent.color }}>{players.opponent.displayName}</span>
        </h2>
        {neutral.setScores ? (
          <p className="set-line">{neutral.setScores.join("   ")}</p>
        ) : (
          <p className="set-line set-line-missing">{neutral.alan}—{neutral.opponent} so far · summary only</p>
        )}
        {match.location ? <p className="match-meta">{match.location}</p> : null}
        {match.notes ? <p className="match-notes">{match.notes}</p> : null}
      </div>
      <span className="match-card-chevron" aria-hidden="true">›</span>
    </button>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
