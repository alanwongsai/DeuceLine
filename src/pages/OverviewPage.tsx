import { ReactNode, useState } from "react";
import { MatchDetail } from "../components/MatchDetail";
import { OverviewSheets, OverviewSheetState } from "../components/OverviewSheets";
import { SurfaceBadge } from "../components/SurfaceBadge";
import { useCountUp } from "../components/useMotion";
import { deriveCadence, deriveFirstSetConversion, deriveOverviewStats, formatNeutralScoreline, formatWinnerScoreline, isUnfinished, sortMatchesNewestFirst } from "../domain/deriveStats";
import { deriveRivalryNote } from "../domain/narrative";
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
  // Display history includes unfinished matches; the stats object deliberately
  // excludes them from every record, streak, split, timeline and cadence view.
  const displayMatches = sortMatchesNewestFirst(dataset.matches);
  const latest = displayMatches[0];
  const earlier = displayMatches.slice(1, 3);
  // The timeline teaser follows the same finished-match boundary as every
  // derived rivalry stat. A dated suspended match must not extend the span.
  const datedMatches = stats.sortedMatches.filter((match) => match.date).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const firstDate = datedMatches[0]?.date;
  const lastDate = datedMatches.at(-1)?.date;
  const lead = stats.matchRecord.alan - stats.matchRecord.opponent;
  const recent = stats.recentForm.reduce(
    (record, item) => ({ ...record, [item.winner]: record[item.winner] + 1 }),
    { alan: 0, opponent: 0 },
  );
  const streakWinner = stats.currentStreak.winner;
  const winRates = formatPercentagePair(stats.matchRecord.alan, stats.matchRecord.opponent);
  const leader: PlayerKey | null = lead === 0 ? null : lead > 0 ? "alan" : "opponent";
  const note = deriveRivalryNote(dataset.matches, names);
  const conversion = deriveFirstSetConversion(dataset.matches);

  return (
    <main className="screen screen-overview journal-book">
      <header className="app-header journal-cover">
        <img className="journal-cover-crest" src="./assets/journal-crest-transparent.png" alt="" />
        <div className="journal-cover-title">
          <h1 data-page-title tabIndex={-1}>Deuceline</h1>
          <p>Matchday Journal</p>
        </div>
        <span className="journal-version">v{__APP_VERSION__}</span>
      </header>

      <section className="journal-page" aria-label="Rivalry journal overview">
        <button
          className="journal-rivalry"
          type="button"
          onClick={() => setSheet({ kind: "story" })}
          aria-label={`Rivalry record: ${names.alan} ${stats.matchRecord.alan}, ${names.opponent} ${stats.matchRecord.opponent}; ${stats.totalMatches} finished matches; win rate ${names.alan} ${winRates.alan}, ${names.opponent} ${winRates.opponent}. Open the full rivalry story`}
        >
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
          <span className="journal-rivalry-meta">{stats.totalMatches} finished matches{stats.totalMatches ? <> · {leader ? <b style={{ color: players[leader].color }}>{players[leader].displayName} {winRates[leader]}</b> : <b>50% each</b>}</> : null}</span>
          <span className="journal-rivalry-action">Open rivalry story <img src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" /></span>
        </button>

        <div className="journal-handnote">
          <p>
            {note.length ? note.map((line, index) => <span key={index} className={index === 2 ? "journal-handnote-lean" : undefined}>{keepScoresTogether(line)}</span>) : <span>No finished chapters yet. The next result starts the rivalry story.</span>}
          </p>
          <img src="./assets/journal-stamp.png" alt="" />
        </div>

        <section className="journal-ledger" aria-labelledby="journal-ledger-title">
          <header>
            <strong id="journal-ledger-title">Rivalry ledger</strong>
            <span>Tap for evidence</span>
          </header>
          <div className="journal-ledger-grid">
            <LedgerButton
              label="Set record"
              alanValue={stats.setRecord.alan}
              opponentValue={stats.setRecord.opponent}
              players={players}
              onOpen={() => setSheet({ kind: "setRecord" })}
            />
            <LedgerButton
              label="Deciders"
              alanValue={stats.deciderRecord.alan}
              opponentValue={stats.deciderRecord.opponent}
              players={players}
              onOpen={() => setSheet({ kind: "deciders" })}
            />
            <LedgerButton
              label="Set 1 → win"
              alanValue={conversionRate(conversion.converted.alan, conversion.firstSetWins.alan)}
              opponentValue={conversionRate(conversion.converted.opponent, conversion.firstSetWins.opponent)}
              note={conversion.sample ? `${conversion.converted.alan}/${conversion.firstSetWins.alan} · ${conversion.converted.opponent}/${conversion.firstSetWins.opponent}` : undefined}
              players={players}
              onOpen={() => setSheet({ kind: "conversion" })}
            />
            <button
              type="button"
              className="journal-ledger-cell journal-ledger-streak"
              onClick={() => setSheet({ kind: "streak" })}
              aria-label={`Current run: ${streakWinner ? `${players[streakWinner].displayName} ${stats.currentStreak.count}` : "none"}. Open streak history`}
            >
              <span>Current run</span>
              <strong style={streakWinner ? { color: players[streakWinner].color } : undefined}>{stats.currentStreak.count || "—"}</strong>
              <small>{streakWinner ? players[streakWinner].displayName : "No run"}</small>
            </button>
          </div>
        </section>

        {latest ? (
          <ExpandedChapter match={latest} number={latest.seq} players={players} onOpen={() => setSelectedMatch(latest)} />
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
            <small>{Object.entries(stats.surfaceSplit)
              .filter(([, value]) => value.played > 0)
              .sort(([, a], [, b]) => b.played - a.played)
              .slice(0, 3)
              .map(([surface, value]) => `${titleCase(surface)} ${value.played}`)
              .join(" · ") || "No finished matches"}</small>
          </button>
          <button type="button" onClick={() => setSheet({ kind: "timeline" })}>
            <img src="./assets/icons/clock.svg" alt="" />
            <strong>Timeline</strong><span>Span</span>
            <small>{firstDate && lastDate ? `${shortDate(firstDate)} — ${shortDate(lastDate)}` : `${cadence.datedCount} dated`}</small>
          </button>
        </section>

        <section className="journal-chapter-index" aria-label="Earlier chapters">
          {earlier.map((match) => (
            <ChapterRow key={match.id} match={match} number={match.seq} players={players} onOpen={() => setSelectedMatch(match)} />
          ))}
          {onShowMatches ? <button type="button" className="journal-view-all" onClick={onShowMatches}>View all {dataset.matches.length} matches <img src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" /></button> : null}
        </section>

        <footer className="journal-coverage">
          <img src="./assets/icons/book-open.svg" alt="" />
          <p>
            <strong>Evidence behind the story</strong>
            <span>Dates {stats.coverage.datedMatches}/{stats.coverage.finishedMatches} · Set scores {stats.coverage.detailedScoreMatches}/{stats.coverage.finishedMatches} · Weather {stats.coverage.weatherMatches}/{stats.coverage.finishedMatches}</span>
          </p>
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

      {sheet ? (
        <OverviewSheets
          key={sheet.kind === "surface" ? `surface-${sheet.surface}` : sheet.kind}
          sheet={sheet}
          dataset={dataset}
          stats={stats}
          onChange={setSheet}
          onSelectMatch={(match) => {
            setSheet(null);
            setSelectedMatch(match);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </main>
  );
}

type LedgerButtonProps = {
  label: string;
  alanValue: number | string;
  opponentValue: number | string;
  // Optional evidence line under the values (e.g. the conversion sample).
  note?: string;
  players: DeucelineDataset["rivalry"]["players"];
  onOpen: () => void;
};

function LedgerButton({ label, alanValue, opponentValue, note, players, onOpen }: LedgerButtonProps) {
  return (
    <button
      type="button"
      className="journal-ledger-cell"
      onClick={onOpen}
      aria-label={`${label}: ${players.alan.displayName} ${alanValue}, ${players.opponent.displayName} ${opponentValue}. Open evidence`}
    >
      <span>{label}</span>
      <strong>
        <b style={{ color: players.alan.color }}>{alanValue}</b>
        <i>—</i>
        <b style={{ color: players.opponent.color }}>{opponentValue}</b>
      </strong>
      {note ? <small>{note}</small> : null}
    </button>
  );
}

function ExpandedChapter({ match, number, players, onOpen }: ChapterProps) {
  if (isUnfinished(match)) {
    const score = formatNeutralScoreline(match);
    const splitStripe = `linear-gradient(180deg, ${players.alan.color} 0 50%, ${players.opponent.color} 50% 100%)`;
    return (
      <button type="button" className="journal-expanded-chapter journal-expanded-unfinished" onClick={onOpen} aria-label={`Latest match in progress. ${players.alan.displayName} ${score.alan}, ${players.opponent.displayName} ${score.opponent}. Open details`}>
        <span className="journal-chapter-stripe" style={{ background: splitStripe }} />
        <span className="journal-chapter-number journal-chapter-number-neutral">{number}</span>
        <span className="journal-chapter-copy">
          <span className="journal-chapter-eyebrow">Latest match · In progress</span>
          <span className="journal-chapter-date">{match.date ? shortDate(match.date) : `Match ${match.seq}`} · {match.location ?? "Location unknown"}</span>
          <strong><span style={{ color: players.alan.color }}>{players.alan.displayName} {score.alan}</span>—<span style={{ color: players.opponent.color }}>{score.opponent} {players.opponent.displayName}</span></strong>
          <span className="journal-set-scores">{score.setScores?.join(", ") ?? `${score.alan}—${score.opponent} so far`}</span>
          <em>Awaiting the final result.</em>
        </span>
        <SurfaceBadge surface={match.surface} />
        <img className="journal-collapse" src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" />
      </button>
    );
  }
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
        <em>{winner.displayName} prevails on {titleCase(match.surface)}.</em>
      </span>
      <SurfaceBadge surface={match.surface} />
      <img className="journal-collapse" src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" />
    </button>
  );
}

function ChapterRow({ match, number, players, onOpen }: ChapterProps) {
  if (isUnfinished(match)) {
    const score = formatNeutralScoreline(match);
    const splitStripe = `linear-gradient(180deg, ${players.alan.color} 0 50%, ${players.opponent.color} 50% 100%)`;
    return (
      <button type="button" className="journal-chapter-row journal-chapter-row-unfinished" onClick={onOpen} aria-label={`Match in progress. ${players.alan.displayName} ${score.alan}, ${players.opponent.displayName} ${score.opponent}. Open match detail`}>
        <span className="journal-chapter-stripe" style={{ background: splitStripe }} />
        <span className="journal-chapter-number journal-chapter-number-neutral">{number}</span>
        <span className="journal-row-copy"><small>{match.date ? shortDate(match.date) : `Match ${match.seq} · date unknown`}{match.location ? ` · ${match.location}` : ""}</small><strong>In progress · {score.alan}—{score.opponent}</strong></span>
        <SurfaceBadge surface={match.surface} />
        <img className="journal-expand" src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" />
      </button>
    );
  }
  const score = formatWinnerScoreline(match);
  const winner = players[score.winner];
  return (
    <button type="button" className="journal-chapter-row" onClick={onOpen} aria-label={`${winner.displayName} won ${score.score}. Open match detail`}>
      <span className="journal-chapter-stripe" style={{ background: winner.color }} />
      <span className="journal-chapter-number" style={{ background: winner.color }}>{number}</span>
      <span className="journal-row-copy"><small>{match.date ? shortDate(match.date) : `Match ${match.seq} · date unknown`}{match.location ? ` · ${match.location}` : ""}</small><strong>{winner.displayName} won {score.score}</strong></span>
      <SurfaceBadge surface={match.surface} />
      <img className="journal-expand" src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" />
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

// Scores like "8–6" or "10–8" must not break at the dash across handnote lines.
function keepScoresTogether(line: string): ReactNode[] {
  return line.split(/(\d+–\d+)/).map((part, index) => (index % 2 ? <span key={index} className="nowrap">{part}</span> : part));
}

// "—" when the player has never won a first set, rather than a misleading 0%.
function conversionRate(converted: number, firstSetWins: number): string {
  return firstSetWins ? `${Math.round((converted / firstSetWins) * 100)}%` : "—";
}

function formatPercentagePair(alan: number, opponent: number): Record<PlayerKey, string> {
  const total = alan + opponent;
  if (!total) return { alan: "0%", opponent: "0%" };
  const alanPercentage = Math.round((alan / total) * 100);
  return { alan: `${alanPercentage}%`, opponent: `${100 - alanPercentage}%` };
}
