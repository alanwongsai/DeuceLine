import { useState } from "react";
import { MatchCard } from "../components/MatchCard";
import { MatchDetail } from "../components/MatchDetail";
import { sortMatchesNewestFirst } from "../domain/deriveStats";
import { DeucelineDataset, Match, Surface, SURFACES } from "../domain/schema";

type MatchesPageProps = {
  dataset: DeucelineDataset;
  onUpdateMatch?: (match: Match) => void;
};

export function MatchesPage({ dataset, onUpdateMatch }: MatchesPageProps) {
  const sortedMatches = sortMatchesNewestFirst(dataset.matches);
  const players = dataset.rivalry.players;
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<Surface | null>(null);
  const surfaceCounts = Object.fromEntries(SURFACES.map((surface) => [surface, sortedMatches.filter((match) => match.surface === surface).length])) as Record<Surface, number>;
  const visibleMatches = filter ? sortedMatches.filter((match) => match.surface === filter) : sortedMatches;

  return (
    <main className="screen screen-matches">
      <header className="page-header">
        <img className="journal-archive-crest" src="./assets/journal-crest.png" alt="" />
        <div>
          <p className="eyebrow">Matchday Journal</p>
          <h1>Chapters</h1>
        </div>
        <span className="count-pill">{visibleMatches.length}</span>
      </header>
      <div className="match-filters" aria-label="Filter matches by surface">
        <button type="button" className={`filter-chip ${filter === null ? "active" : ""}`} aria-pressed={filter === null} onClick={() => setFilter(null)}>All · {sortedMatches.length}</button>
        {SURFACES.filter((surface) => surfaceCounts[surface] > 0).map((surface) => (
          <button key={surface} type="button" className={`filter-chip ${filter === surface ? "active" : ""}`} aria-pressed={filter === surface} onClick={() => setFilter(surface)}>{surface.charAt(0).toUpperCase() + surface.slice(1)} · {surfaceCounts[surface]}</button>
        ))}
      </div>
      <section className="match-list" aria-label="Matches newest first">
        {visibleMatches.map((match) => (
          <MatchCard key={match.id} match={match} players={players} onOpen={() => setSelectedMatch(match)} />
        ))}
      </section>
      {selectedMatch ? (
        <MatchDetail
          match={selectedMatch}
          players={players}
          matches={dataset.matches}
          onClose={() => setSelectedMatch(null)}
          onSelectMatch={setSelectedMatch}
          onUpdate={
            onUpdateMatch
              ? () => {
                  const target = selectedMatch;
                  setSelectedMatch(null);
                  onUpdateMatch(target);
                }
              : undefined
          }
        />
      ) : null}
    </main>
  );
}
