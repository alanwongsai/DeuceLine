import { formatWinnerScoreline } from "../domain/deriveStats";
import { Match, Player, PlayerKey } from "../domain/schema";
import { SurfaceBadge } from "./SurfaceBadge";

type MatchCardProps = {
  match: Match;
  players: Record<PlayerKey, Player>;
  onOpen: () => void;
};

export function MatchCard({ match, players, onOpen }: MatchCardProps) {
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
            <span className="match-seq">Match {match.seq}</span>
          )}
          <SurfaceBadge surface={match.surface} />
        </div>
        <h2>
          {winner.displayName} won {scoreline.score}
        </h2>
        {scoreline.setScores ? (
          <p className="set-line">{scoreline.setScores.join("   ")}</p>
        ) : (
          <p className="set-line set-line-missing">Set scores not recorded</p>
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
