import { useState } from "react";
import { MatchCard } from "../components/MatchCard";
import { MatchDetail } from "../components/MatchDetail";
import { sortMatchesNewestFirst } from "../domain/deriveStats";
import { DeucelineDataset, Match } from "../domain/schema";

export function MatchesPage({ dataset }: { dataset: DeucelineDataset }) {
  const sortedMatches = sortMatchesNewestFirst(dataset.matches);
  const players = dataset.rivalry.players;
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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
          <MatchCard key={match.id} match={match} players={players} onOpen={() => setSelectedMatch(match)} />
        ))}
      </section>
      {selectedMatch ? (
        <MatchDetail
          match={selectedMatch}
          players={players}
          matches={dataset.matches}
          onClose={() => setSelectedMatch(null)}
        />
      ) : null}
    </main>
  );
}
