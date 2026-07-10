import { useState } from "react";
import { MatchDetail } from "../components/MatchDetail";
import { OverviewSheets, OverviewSheetState } from "../components/OverviewSheets";
import { SurfaceBadge } from "../components/SurfaceBadge";
import { useCountUp } from "../components/useMotion";
import { deriveCadence, deriveOverviewStats, formatWinnerScoreline } from "../domain/deriveStats";
import { DeucelineDataset, Match, PlayerKey } from "../domain/schema";

type OverviewPageProps = {
  dataset: DeucelineDataset;
  onUpdateMatch?: (match: Match) => void;
  onShowMatches?: () => void;
};

export function OverviewPage({ dataset, onUpdateMatch, onShowMatches }: OverviewPageProps) {
  const stats = deriveOverviewStats(dataset.matches);
  const cadence = deriveCadence(dataset.matches, new Date());
  const players = dataset.rivalry.players;
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [sheet, setSheet] = useState<OverviewSheetState | null>(null);
  const alanScore = useCountUp(stats.matchRecord.alan);
  const opponentScore = useCountUp(stats.matchRecord.opponent);
  const names = { alan: players.alan.displayName, opponent: players.opponent.displayName };
  const latest = stats.sortedMatches[0];
  const earlier = stats.sortedMatches.slice(1, 5);
  const datedMatches = dataset.matches.filter((match) => match.date).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const firstDate = datedMatches[0]?.date;
  const lastDate = datedMatches.at(-1)?.date;
  const lead = stats.matchRecord.alan - stats.matchRecord.opponent;
  const recent = stats.recentForm.reduce(
    (record, item) => ({ ...record, [item.winner]: record[item.winner] + 1 }),
    { alan: 0, opponent: 0 },
  );
  const streakWinner = stats.currentStreak.winner;
  const leader = lead === 0 ? "The rivalry is level." : `${lead > 0 ? names.alan : names.opponent} edges ahead again on ${latest ? titleCase(latest.surface) : "court"}.`;
  const streakLine = stats.currentStreak.count > 1 ? `${numberWord(stats.currentStreak.count)} wins in a row` : "A new chapter begins";
  const formWord = numberWord(Math.max(recent.alan, recent.opponent)).toLowerCase();

  return (
    <main className="screen screen-overview journal-book">
      <header className="app-header journal-cover">
        <img className="journal-cover-crest" src="./assets/journal-crest-transparent.png" alt="" />
        <div className="journal-cover-title">
          <h1>Deuceline</h1>
          <p>Matchday Journal</p>
        </div>
        <span className="journal-version">v{__APP_VERSION__}</span>
      </header>

      <section className="journal-page" aria-label="Rivalry journal overview">
        <button className="journal-rivalry" type="button" onClick={() => setSheet({ kind: "story" })}>
          <span className="journal-rivalry-kicker">The rivalry</span>
          <span className="journal-rivalry-names">
            <strong style={{ color: players.alan.color }}>{names.alan}</strong>
            <i>vs</i>
            <strong style={{ color: players.opponent.color }}>{names.opponent}</strong>
          </span>
          <span className="journal-rivalry-subtitle">Private record of a shared competition</span>
          <span className="journal-rivalry-score" aria-hidden="true">
            <strong style={{ color: players.alan.color }}>{alanScore}</strong><i>—</i><strong style={{ color: players.opponent.color }}>{opponentScore}</strong>
          </span>
          <span className="journal-rivalry-label">Head-to-head</span>
          <span className="journal-rivalry-meta">{stats.totalMatches} finished matches · current streak: <b>{streakWinner ? `${players[streakWinner].displayName} ${stats.currentStreak.count}` : "none"}</b></span>
        </button>

        <div className="journal-handnote">
          <p>{leader}<br />{streakLine} and {formWord} of<br />the last five.</p>
          <img src="./assets/journal-stamp.png" alt="" />
        </div>

        {latest ? (
          <ExpandedChapter match={latest} number={1} players={players} onOpen={() => setSelectedMatch(latest)} />
        ) : null}

        <section className="journal-lens-strip" aria-label="Explore rivalry analysis">
          <button type="button" onClick={() => setSheet({ kind: "form" })}>
            <img src="./assets/icons/chart-line.svg" alt="" />
            <strong>Form</strong><span>Last 5</span>
            <small><b style={{ color: players.alan.color }}>{names.alan} {recent.alan}</b>—{recent.opponent} <b style={{ color: players.opponent.color }}>{names.opponent}</b></small>
          </button>
          <button type="button" onClick={() => setSheet({ kind: "surfaces" })}>
            <img src="./assets/icons/table-cells.svg" alt="" />
            <strong>Surfaces</strong><span>Tally</span>
            <small>Astro {stats.surfaceSplit.astro.played} · Clay {stats.surfaceSplit.clay.played} · Hard {stats.surfaceSplit.hard.played}</small>
          </button>
          <button type="button" onClick={() => setSheet({ kind: "timeline" })}>
            <img src="./assets/icons/clock.svg" alt="" />
            <strong>Timeline</strong><span>Span</span>
            <small>{firstDate && lastDate ? `${shortDate(firstDate)} — ${shortDate(lastDate)}` : `${cadence.datedCount} dated`}</small>
          </button>
        </section>

        <section className="journal-chapter-index" aria-label="Earlier chapters">
          {earlier.map((match, index) => (
            <ChapterRow key={match.id} match={match} number={index + 2} players={players} onOpen={() => setSelectedMatch(match)} />
          ))}
          {onShowMatches ? <button type="button" className="journal-view-all" onClick={onShowMatches}>View all {dataset.matches.length} chapters <img src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" /></button> : null}
        </section>

        <footer className="journal-coverage">
          <img src="./assets/icons/book-open.svg" alt="" />
          <p><strong>Data coverage: {stats.coverage.finishedMatches} finished matches.</strong><span>{stats.coverage.datedMatches < stats.coverage.finishedMatches ? `Dates unknown for ${stats.coverage.finishedMatches - stats.coverage.datedMatches} earlier matches.` : "Every match is dated."}</span></p>
          <small>Deuceline v{__APP_VERSION__} · {dataset.matches.length} matches recorded</small>
        </footer>
      </section>

      {selectedMatch ? (
        <MatchDetail
          match={selectedMatch}
          players={players}
          matches={dataset.matches}
          onClose={() => setSelectedMatch(null)}
          onUpdate={onUpdateMatch ? () => { const target = selectedMatch; setSelectedMatch(null); onUpdateMatch(target); } : undefined}
          onSelectMatch={setSelectedMatch}
        />
      ) : null}

      {sheet ? <OverviewSheets sheet={sheet} dataset={dataset} stats={stats} onClose={() => setSheet(null)} /> : null}
    </main>
  );
}

function ExpandedChapter({ match, number, players, onOpen }: ChapterProps) {
  const score = formatWinnerScoreline(match);
  const winner = players[score.winner];
  return (
    <button type="button" className="journal-expanded-chapter" onClick={onOpen} aria-label={`Latest chapter. ${winner.displayName} won ${score.score}. Open details`}>
      <span className="journal-chapter-stripe" style={{ background: winner.color }} />
      <span className="journal-chapter-number" style={{ background: winner.color }}>{number}</span>
      <span className="journal-chapter-copy">
        <span className="journal-chapter-eyebrow">Latest chapter</span>
        <span className="journal-chapter-date">{match.date ? shortDate(match.date) : `Match ${match.seq}`} · {match.location ?? "Location unknown"}</span>
        <strong>{winner.displayName} won {score.score}</strong>
        <span className="journal-set-scores">{score.setScores?.join(", ") ?? `${score.score} final`}</span>
        <span className="journal-chapter-facts">
          <span className="journal-date-fact"><small>Date</small>{match.date ? shortDate(match.date) : "Unknown"}<img src="./assets/icons/calendar.svg" alt="" aria-hidden="true" /></span>
          <span><small>Location</small>{match.location ?? "Unknown"}</span>
          <span><small>Surface</small><SurfaceBadge surface={match.surface} /></span>
          <span><small>Format</small>Best of 3 sets</span>
        </span>
        <em>{winner.displayName} prevails on {titleCase(match.surface)}.</em>
      </span>
      <SurfaceBadge surface={match.surface} />
      <img className="journal-collapse" src="./assets/icons/chevron-up.svg" alt="" aria-hidden="true" />
    </button>
  );
}

function ChapterRow({ match, number, players, onOpen }: ChapterProps) {
  const score = formatWinnerScoreline(match);
  const winner = players[score.winner];
  return (
    <button type="button" className="journal-chapter-row" onClick={onOpen} aria-label={`${winner.displayName} won ${score.score}. Open match detail`}>
      <span className="journal-chapter-stripe" style={{ background: winner.color }} />
      <span className="journal-chapter-number" style={{ background: winner.color }}>{number}</span>
      <span className="journal-row-copy"><small>{match.date ? shortDate(match.date) : `Match ${match.seq} · date unknown`}{match.location ? ` · ${match.location}` : ""}</small><strong>{winner.displayName} won {score.score}</strong></span>
      <SurfaceBadge surface={match.surface} />
      <img className="journal-expand" src="./assets/icons/chevron-down.svg" alt="" aria-hidden="true" />
    </button>
  );
}

type ChapterProps = {
  match: Match;
  number: number;
  players: DeucelineDataset["rivalry"]["players"];
  onOpen: () => void;
};

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function numberWord(value: number): string {
  return ["No", "One", "Two", "Three", "Four", "Five"][value] ?? String(value);
}
