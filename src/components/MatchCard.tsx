import { deriveMatchResult, formatMatchScore } from "../domain/deriveStats";
import { Match, PlayerKey } from "../domain/schema";
import { SurfaceBadge } from "./SurfaceBadge";

type MatchCardProps = {
  match: Match;
  playerNames: Record<PlayerKey, string>;
};

export function MatchCard({ match, playerNames }: MatchCardProps) {
  const result = deriveMatchResult(match);

  return (
    <article className={`match-card ${result.winner === "alan" ? "win" : "loss"}`}>
      <div className="match-card-stripe" aria-hidden="true" />
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
          {playerNames[result.winner]} won {formatMatchScore(match)}
        </h2>
        {result.setScores ? <p className="set-line">{result.setScores.join("   ")}</p> : null}
        {match.location ? <p className="match-meta">{match.location}</p> : null}
        {match.notes ? <p className="match-notes">{match.notes}</p> : null}
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
