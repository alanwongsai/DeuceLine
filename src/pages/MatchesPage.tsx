import { useEffect, useMemo, useState } from "react";
import { MatchCard } from "../components/MatchCard";
import { MatchDetail } from "../components/MatchDetail";
import { isUnfinished, sortMatchesNewestFirst } from "../domain/deriveStats";
import { DeucelineDataset, Match, Surface, SURFACES } from "../domain/schema";

type MatchesPageProps = {
  dataset: DeucelineDataset;
  onUpdateMatch?: (match: Match) => void;
};

export function MatchesPage({ dataset, onUpdateMatch }: MatchesPageProps) {
  const sortedMatches = useMemo(() => sortMatchesNewestFirst(dataset.matches), [dataset.matches]);
  const players = dataset.rivalry.players;
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<Surface | null>(null);
  const surfaceCounts = useMemo(
    () => Object.fromEntries(SURFACES.map((surface) => [surface, sortedMatches.filter((match) => match.surface === surface).length])) as Record<Surface, number>,
    [sortedMatches],
  );
  const visibleMatches = filter ? sortedMatches.filter((match) => match.surface === filter) : sortedMatches;
  const unfinishedCount = sortedMatches.filter(isUnfinished).length;
  const finishedCount = sortedMatches.length - unfinishedCount;

  useEffect(() => {
    if (filter && surfaceCounts[filter] === 0) setFilter(null);
  }, [filter, surfaceCounts]);

  return (
    <main className="screen screen-matches journal-book">
      <header className="app-header journal-cover journal-archive-cover">
        <img className="journal-cover-crest" src="./assets/journal-crest-transparent.png" alt="" />
        <div className="journal-cover-title">
          <h1 data-page-title tabIndex={-1}>Match archive</h1>
          <p>Matchday Journal</p>
        </div>
        <span className="journal-version journal-archive-count" aria-live="polite" aria-label={`${visibleMatches.length} matches shown`}>
          <strong>{visibleMatches.length}</strong>
          <small>matches</small>
        </span>
      </header>
      <section className="journal-archive-page" aria-label="Complete match archive">
        <header className="archive-page-heading">
          <div>
            <p>Complete record</p>
            <h2>Recorded chapters</h2>
          </div>
          <p className="archive-summary">
            <strong>{sortedMatches.length} recorded</strong>
            <span>{finishedCount} finished{unfinishedCount ? ` · ${unfinishedCount} in progress` : ""}</span>
          </p>
        </header>
        <div className="match-filters" role="group" aria-label="Filter matches by surface">
          <button type="button" className={`filter-chip ${filter === null ? "active" : ""}`} aria-pressed={filter === null} onClick={() => setFilter(null)}>All · {sortedMatches.length}</button>
          {SURFACES.filter((surface) => surfaceCounts[surface] > 0).map((surface) => (
            <button key={surface} type="button" className={`filter-chip ${filter === surface ? "active" : ""}`} aria-pressed={filter === surface} onClick={() => setFilter(surface)}>{surface.charAt(0).toUpperCase() + surface.slice(1)} · {surfaceCounts[surface]}</button>
          ))}
        </div>
        <section className="match-list" aria-label="Matches newest first">
          {visibleMatches.map((match) => (
            <MatchCard key={match.id} match={match} players={players} onOpen={() => setSelectedMatch(match)} />
          ))}
          {visibleMatches.length === 0 ? (
            <p className="archive-empty">{filter ? "No matches recorded on this surface." : "No matches recorded yet. Use Add to start the archive."}</p>
          ) : null}
        </section>
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
