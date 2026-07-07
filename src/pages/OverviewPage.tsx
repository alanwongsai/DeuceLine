import { useState } from "react";
import { CourtBackdrop } from "../components/CourtBackdrop";
import { MatchDetail } from "../components/MatchDetail";
import { DetailRow, StatDetailSheet } from "../components/StatDetailSheet";
import { StatCard } from "../components/StatCard";
import { deriveOverviewStats } from "../domain/deriveStats";
import { DeucelineDataset, Match, OverviewStats, PlayerKey, Surface, SURFACES } from "../domain/schema";

const surfaceLabels: Record<Surface, string> = {
  hard: "Hard",
  clay: "Clay",
  grass: "Grass",
  astro: "Astro",
};

type MetricKind = "matchRecord" | "setRecord" | "winRate";

const metricLabels: Record<MetricKind, string> = {
  matchRecord: "Match record",
  setRecord: "Set record",
  winRate: "Win rate",
};

type SheetState = { kind: MetricKind } | { kind: "streak" } | { kind: "surface"; surface: Surface };

type SurfaceRow = OverviewStats["surfaceSplit"][Surface];

type OverviewPageProps = {
  dataset: DeucelineDataset;
  onUpdateMatch?: (match: Match) => void;
};

export function OverviewPage({ dataset, onUpdateMatch }: OverviewPageProps) {
  const stats = deriveOverviewStats(dataset.matches);
  const players = dataset.rivalry.players;
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const playerNames = {
    alan: players.alan.displayName,
    opponent: players.opponent.displayName,
  };
  const lead = stats.matchRecord.alan - stats.matchRecord.opponent;
  const leaderText =
    lead === 0
      ? "Rivalry is level"
      : `${lead > 0 ? playerNames.alan : playerNames.opponent} leads by ${Math.abs(lead)} match${Math.abs(lead) === 1 ? "" : "es"}`;
  const streakWinner = stats.currentStreak.winner;
  const hasMatches = stats.totalMatches > 0;
  const winRate = (key: PlayerKey) =>
    stats.totalMatches === 0 ? 0 : Math.round((stats.matchRecord[key] / stats.totalMatches) * 100);
  const surfacesByPlayed = [...SURFACES].sort(
    (a, b) => stats.surfaceSplit[b].played - stats.surfaceSplit[a].played,
  );

  const recordBar = (alanCount: number, opponentCount: number, total: number) =>
    total === 0
      ? undefined
      : {
          leftPct: (alanCount / total) * 100,
          rightPct: (opponentCount / total) * 100,
          leftColor: players.alan.color,
          rightColor: players.opponent.color,
        };

  const metricValue = (row: SurfaceRow, metric: MetricKind): string => {
    if (metric === "setRecord") {
      const total = row.setsAlan + row.setsOpponent;
      return total ? `${row.setsAlan}—${row.setsOpponent}` : "—";
    }
    if (metric === "winRate") {
      return row.played
        ? `${Math.round((row.alan / row.played) * 100)}% · ${Math.round((row.opponent / row.played) * 100)}%`
        : "—";
    }
    return row.played ? `${row.alan}—${row.opponent}` : "—";
  };

  const metricBar = (row: SurfaceRow, metric: MetricKind) =>
    metric === "setRecord"
      ? recordBar(row.setsAlan, row.setsOpponent, row.setsAlan + row.setsOpponent)
      : recordBar(row.alan, row.opponent, row.played);

  const metricSheetRows = (metric: MetricKind): DetailRow[] =>
    surfacesByPlayed.map((surface) => {
      const row = stats.surfaceSplit[surface];
      return {
        key: surface,
        label: surfaceLabels[surface],
        meta: row.played ? String(row.played) : undefined,
        value: metricValue(row, metric),
        bar: metricBar(row, metric),
      };
    });

  const surfaceSheetRows = (surface: Surface): DetailRow[] => {
    const row = stats.surfaceSplit[surface];
    const deciderTotal = row.decidersAlan + row.decidersOpponent;
    const streak = stats.surfaceStreak[surface];

    const metricRows = (["matchRecord", "setRecord", "winRate"] as MetricKind[]).map((metric) => ({
      key: metric,
      label: metricLabels[metric],
      value: metricValue(row, metric),
      bar: metricBar(row, metric),
    }));

    return [
      ...metricRows,
      {
        key: "deciders",
        label: "Deciders",
        value: deciderTotal ? `${row.decidersAlan}—${row.decidersOpponent}` : "—",
        bar: recordBar(row.decidersAlan, row.decidersOpponent, deciderTotal),
      },
      {
        key: "streak",
        label: "Current run",
        value: streak.winner ? `${streak.count} · ${playerNames[streak.winner]}` : "—",
        bar:
          streak.winner === "alan"
            ? { leftPct: 100, rightPct: 0, leftColor: players.alan.color, rightColor: players.opponent.color }
            : streak.winner === "opponent"
              ? { leftPct: 0, rightPct: 100, leftColor: players.alan.color, rightColor: players.opponent.color }
              : undefined,
      },
    ];
  };

  const streakSheetRows = (): DetailRow[] =>
    stats.streakHistory.map((run, index) => ({
      key: `${run.winner}-${index}`,
      label: playerNames[run.winner],
      value: `${run.count} in a row`,
      bar: {
        leftPct: run.winner === "alan" ? 100 : 0,
        rightPct: run.winner === "opponent" ? 100 : 0,
        leftColor: players.alan.color,
        rightColor: players.opponent.color,
      },
    }));

  return (
    <main className="screen screen-overview">
      <header className="app-header">
        <p className="eyebrow">Track the rivalry. Set by set.</p>
        <h1>Deuceline</h1>
        <p>{dataset.rivalry.title}</p>
      </header>

      <section className="hero-score" aria-label="Head-to-head score">
        <CourtBackdrop players={players} />
        <div className="score-grid">
          <span className="score-name score-name-left">{playerNames.alan}</span>
          <span className="score-name score-name-right">{playerNames.opponent}</span>
          <strong className="score-val score-val-left">{stats.matchRecord.alan}</strong>
          <span className="score-divider" aria-hidden="true">
            —
          </span>
          <strong className="score-val score-val-right">{stats.matchRecord.opponent}</strong>
        </div>
        <p>{leaderText}</p>
        <span>{stats.totalMatches} matches played</span>
      </section>

      <section className="panel panel-form">
        <div className="panel-header">
          <h2>Recent form</h2>
          <span>Newest first</span>
        </div>
        <div className="form-row" aria-label="Recent form newest first">
          {stats.recentForm.map((item) => {
            const match = dataset.matches.find((candidate) => candidate.id === item.matchId);
            return (
              <button
                type="button"
                className="form-dot"
                key={item.matchId}
                style={{ background: players[item.winner].color }}
                onClick={() => match && setSelectedMatch(match)}
                aria-label={`${playerNames[item.winner]} won — open match detail`}
              >
                {players[item.winner].abbr}
              </button>
            );
          })}
        </div>
      </section>

      <section className="stat-grid" aria-label="Rivalry statistics">
        <StatCard
          label="Match record"
          value={`${stats.matchRecord.alan}—${stats.matchRecord.opponent}`}
          onClick={hasMatches ? () => setSheet({ kind: "matchRecord" }) : undefined}
        />
        <StatCard
          label="Set record"
          value={`${stats.setRecord.alan}—${stats.setRecord.opponent}`}
          onClick={hasMatches ? () => setSheet({ kind: "setRecord" }) : undefined}
        />
        <StatCard
          label="Win rate"
          value={`${winRate("alan")}% · ${winRate("opponent")}%`}
          onClick={hasMatches ? () => setSheet({ kind: "winRate" }) : undefined}
        />
        <StatCard
          label="Current streak"
          value={streakWinner ? String(stats.currentStreak.count) : "—"}
          detail={streakWinner ? playerNames[streakWinner] : undefined}
          accentColor={streakWinner ? players[streakWinner].color : undefined}
          onClick={hasMatches ? () => setSheet({ kind: "streak" }) : undefined}
        />
      </section>

      <section className="panel panel-surface">
        <div className="panel-header">
          <h2>By surface</h2>
          <span className="surface-legend">
            <span className="legend-item">
              <i className="legend-dot" style={{ background: players.alan.color }} aria-hidden="true" />
              {playerNames.alan}
            </span>
            <span className="legend-item">
              <i className="legend-dot" style={{ background: players.opponent.color }} aria-hidden="true" />
              {playerNames.opponent}
            </span>
          </span>
        </div>
        <div className="surface-list">
          {surfacesByPlayed.map((surface) => {
            const row = stats.surfaceSplit[surface];
            const played = row.played;
            return (
              <button
                type="button"
                className={`surface-row ${played ? "" : "surface-row-empty"}`}
                key={surface}
                onClick={() => setSheet({ kind: "surface", surface })}
                aria-label={`${surfaceLabels[surface]} breakdown`}
              >
                <span>
                  {surfaceLabels[surface]}
                  {played ? <em className="surface-count"> · {played}</em> : null}
                </span>
                <div className="surface-track surface-h2h">
                  {played ? (
                    <>
                      <span className="h2h-fill" style={{ width: `${(row.alan / played) * 100}%`, background: players.alan.color }} />
                      <span className="h2h-fill" style={{ width: `${(row.opponent / played) * 100}%`, background: players.opponent.color }} />
                    </>
                  ) : null}
                </div>
                <strong>{played ? `${row.alan}—${row.opponent}` : "—"}</strong>
              </button>
            );
          })}
        </div>
      </section>

      {selectedMatch ? (
        <MatchDetail
          match={selectedMatch}
          players={players}
          matches={dataset.matches}
          onClose={() => setSelectedMatch(null)}
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

      {sheet ? (
        <StatDetailSheet
          titleId="statDetailTitle"
          eyebrow={sheet.kind === "streak" ? "Newest first" : sheet.kind === "surface" ? "Surface breakdown" : "By surface"}
          title={
            sheet.kind === "streak" ? "Streak history" : sheet.kind === "surface" ? surfaceLabels[sheet.surface] : metricLabels[sheet.kind]
          }
          rows={
            sheet.kind === "streak"
              ? streakSheetRows()
              : sheet.kind === "surface"
                ? surfaceSheetRows(sheet.surface)
                : metricSheetRows(sheet.kind)
          }
          onClose={() => setSheet(null)}
        />
      ) : null}
    </main>
  );
}
