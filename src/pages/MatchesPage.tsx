import { MatchCard } from "../components/MatchCard";
import { sortMatchesNewestFirst } from "../domain/deriveStats";
import { DeucelineDataset } from "../domain/schema";

export function MatchesPage({ dataset }: { dataset: DeucelineDataset }) {
  const sortedMatches = sortMatchesNewestFirst(dataset.matches);
  const playerNames = {
    alan: dataset.rivalry.players.alan.displayName,
    opponent: dataset.rivalry.players.opponent.displayName,
  };

  return (
    <main className="screen">
      <header className="page-header">
        <div>
          <p className="eyebrow">Match History</p>
          <h1>Matches</h1>
        </div>
        <span className="count-pill">{sortedMatches.length}</span>
      </header>
      <section className="match-list" aria-label="Matches newest first">
        {sortedMatches.map((match) => (
          <MatchCard key={match.id} match={match} playerNames={playerNames} />
        ))}
      </section>
    </main>
  );
}
