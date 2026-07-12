import {
  deriveCadence,
  deriveGamesTally,
  deriveScorelineDistribution,
  deriveSurfaceForm,
  longestRun,
  maxLead,
} from "../domain/deriveStats";
import { DeucelineDataset, Match, OverviewStats, PlayerKey, Surface, SURFACES } from "../domain/schema";
import { LeadSparkline } from "./LeadSparkline";
import { DetailRow, StatDetailSheet } from "./StatDetailSheet";

export type OverviewSheetState =
  | { kind: "story" | "matchRecord" | "setRecord" | "winRate" | "deciders" | "streak" | "form" | "timeline" | "surfaces" }
  | { kind: "surface"; surface: Surface };

type OverviewSheetsProps = {
  sheet: OverviewSheetState;
  dataset: DeucelineDataset;
  stats: OverviewStats;
  onChange: (sheet: OverviewSheetState) => void;
  onSelectMatch: (match: Match) => void;
  onClose: () => void;
};

const surfaceLabels: Record<Surface, string> = {
  hard: "Hard",
  clay: "Clay",
  grass: "Grass",
  astro: "Astro",
};

type Metric = "match" | "sets" | "rate" | "deciders";

export function OverviewSheets({ sheet, dataset, stats, onChange, onSelectMatch, onClose }: OverviewSheetsProps) {
  const players = dataset.rivalry.players;
  const names = { alan: players.alan.displayName, opponent: players.opponent.displayName };
  const surfaces = [...SURFACES].sort((a, b) => stats.surfaceSplit[b].played - stats.surfaceSplit[a].played);
  const games = deriveGamesTally(dataset.matches);
  const distribution = deriveScorelineDistribution(dataset.matches);
  const extremes = maxLead(stats.timeline);
  const cadence = deriveCadence(dataset.matches, new Date());
  const winRate = formatPercentagePair(stats.matchRecord.alan, stats.matchRecord.opponent);
  const recent = stats.recentForm.reduce(
    (record, item) => ({ ...record, [item.winner]: record[item.winner] + 1 }),
    { alan: 0, opponent: 0 },
  );
  const recentMatches = stats.recentForm
    .map((item) => ({ ...item, match: dataset.matches.find((match) => match.id === item.matchId) }))
    .filter((item): item is typeof item & { match: Match } => item.match !== undefined);
  const recordBar = (alan: number, opponent: number) => {
    const total = alan + opponent;
    return total
      ? {
          leftPct: (alan / total) * 100,
          rightPct: (opponent / total) * 100,
          leftColor: players.alan.color,
          rightColor: players.opponent.color,
        }
      : undefined;
  };
  const metricRows = (metric: Metric): DetailRow[] =>
    surfaces.map((surface) => {
      const row = stats.surfaceSplit[surface];
      const alan = metric === "sets" ? row.setsAlan : metric === "deciders" ? row.decidersAlan : row.alan;
      const opponent = metric === "sets" ? row.setsOpponent : metric === "deciders" ? row.decidersOpponent : row.opponent;
      const sample = metric === "deciders" ? alan + opponent : row.played;
      const rowRates = formatPercentagePair(row.alan, row.opponent);
      const value = metric === "rate"
        ? row.played ? `${rowRates.alan} · ${rowRates.opponent}` : "—"
        : sample ? `${alan}—${opponent}` : "—";
      return { key: surface, label: surfaceLabels[surface], meta: sample ? String(sample) : undefined, value, bar: recordBar(alan, opponent), isEmpty: sample === 0 };
    });

  if (sheet.kind === "setRecord") {
    const setTotal = stats.setRecord.alan + stats.setRecord.opponent;
    return (
      <StatDetailSheet
        titleId="statDetailTitle"
        eyebrow="Score evidence"
        title="Set record"
        rows={[
          { key: "games", label: "Known games", meta: `${games.detailedMatchCount}/${games.finishedMatchCount}`, value: games.detailedMatchCount ? `${games.games.alan}—${games.games.opponent}` : "—", bar: recordBar(games.games.alan, games.games.opponent) },
          { key: "margin", label: "Biggest set margin", value: games.biggestSetMargin ? `${games.biggestSetMargin.score} · ${players[games.biggestSetMargin.winner].displayName}` : "—" },
          ...metricRows("sets"),
        ]}
        note={`Games are based on ${games.detailedMatchCount} of ${games.finishedMatchCount} finished matches with full set scores.`}
        onClose={onClose}
      >
        <SheetFacts
          facts={[
            ["Set share", setTotal ? `${Math.round((stats.setRecord.alan / setTotal) * 100)}% · ${Math.round((stats.setRecord.opponent / setTotal) * 100)}%` : "—"],
            ["Straight sets", `${distribution.straightSets.alan}—${distribution.straightSets.opponent}`],
            ["Deciders won", `${distribution.deciders.alan}—${distribution.deciders.opponent}`],
            ["Avg sets", distribution.averageSetsPerMatch?.toFixed(1) ?? "—"],
          ]}
        />
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "winRate" || sheet.kind === "form") {
    const latestRolling = stats.timeline.at(-1)?.rollingWinRateAlan;
    return (
      <StatDetailSheet titleId="statDetailTitle" eyebrow="Match-order form" title={sheet.kind === "form" ? "Recent form" : "Win rate"} rows={metricRows("rate")} onClose={onClose}>
        <div className="sheet-form sheet-form-actions" aria-label="Last five matches, newest first">
          <span>Last five</span>
          {recentMatches.length ? recentMatches.map((item) => (
            <button
              type="button"
              key={item.matchId}
              style={{ background: players[item.winner].color }}
              onClick={() => onSelectMatch(item.match)}
              aria-label={`${players[item.winner].displayName} won match ${item.match.seq}. Open match detail`}
            >
              {players[item.winner].abbr}
            </button>
          )) : <em>No finished matches</em>}
        </div>
        <LeadSparkline timeline={stats.timeline} matches={dataset.matches} players={players} mode="rolling" ariaLabel={`Rolling five-match win share for ${names.alan}`} />
        <SheetFacts facts={[
          ["All matches", `${winRate.alan} · ${winRate.opponent}`],
          ["Last five", `${recent.alan}—${recent.opponent}`],
          ["Latest rolling", latestRolling === undefined ? "—" : `${Math.round(latestRolling * 100)}% ${names.alan}`],
          ["Evidence", `${stats.totalMatches} matches`],
        ]} />
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "deciders") {
    const total = stats.deciderRecord.alan + stats.deciderRecord.opponent;
    return (
      <StatDetailSheet
        titleId="statDetailTitle"
        eyebrow="Pressure points"
        title="Deciding sets"
        rows={metricRows("deciders")}
        note={`Values run ${names.alan}—${names.opponent}. A decider is a finished match that reached its final available set; surface rows show deciders only.`}
        onClose={onClose}
      >
        <SheetFacts facts={[
          [`${names.alan}—${names.opponent}`, total ? `${stats.deciderRecord.alan}—${stats.deciderRecord.opponent}` : "—"],
          ["Decider sample", `${total} of ${distribution.finishedMatchCount}`],
          ["Straight-set wins", `${distribution.straightSets.alan}—${distribution.straightSets.opponent}`],
          ["Avg match length", distribution.averageSetsPerMatch ? `${distribution.averageSetsPerMatch.toFixed(1)} sets` : "—"],
        ]} />
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "streak") {
    const alanLongest = longestRun(stats.streakHistory, "alan");
    const opponentLongest = longestRun(stats.streakHistory, "opponent");
    const scale = Math.max(1, alanLongest, opponentLongest);
    const rows: DetailRow[] = [
      ...stats.streakHistory.map((run, index) => ({
        key: `${run.winner}-${index}`,
        label: players[run.winner].displayName,
        value: `${run.count} in a row`,
        bar: {
          leftPct: run.winner === "alan" ? (run.count / scale) * 100 : 0,
          rightPct: run.winner === "opponent" ? (run.count / scale) * 100 : 0,
          leftColor: players.alan.color,
          rightColor: players.opponent.color,
        },
      })),
      ...surfaces.map((surface) => {
        const run = stats.surfaceStreak[surface];
        return { key: `surface-${surface}`, label: `${surfaceLabels[surface]} run`, value: run.winner ? `${run.count} · ${players[run.winner].displayName}` : "—" };
      }),
    ];
    return (
      <StatDetailSheet titleId="statDetailTitle" eyebrow="Newest first" title="Streak history" rows={rows} onClose={onClose}>
        <SheetFacts facts={[
          ["Current", stats.currentStreak.winner ? `${stats.currentStreak.count} · ${players[stats.currentStreak.winner].displayName}` : "—"],
          [`${names.alan} longest`, String(alanLongest)],
          [`${names.opponent} longest`, String(opponentLongest)],
        ]} />
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "surface") {
    const row = stats.surfaceSplit[sheet.surface];
    const deciders = row.decidersAlan + row.decidersOpponent;
    const run = stats.surfaceStreak[sheet.surface];
    const form = deriveSurfaceForm(dataset.matches, sheet.surface);
    const formMatches = form
      .map((item) => ({ ...item, match: dataset.matches.find((match) => match.id === item.matchId) }))
      .filter((item): item is typeof item & { match: Match } => item.match !== undefined);
    const surfaceRates = formatPercentagePair(row.alan, row.opponent);
    return (
      <StatDetailSheet
        titleId="statDetailTitle"
        eyebrow="Surface chapter"
        title={surfaceLabels[sheet.surface]}
        rows={[
          { key: "matches", label: "Match record", value: row.played ? `${row.alan}—${row.opponent}` : "—", bar: recordBar(row.alan, row.opponent) },
          { key: "sets", label: "Set record", value: row.played ? `${row.setsAlan}—${row.setsOpponent}` : "—", bar: recordBar(row.setsAlan, row.setsOpponent) },
          { key: "rate", label: "Win rate", value: row.played ? `${surfaceRates.alan} · ${surfaceRates.opponent}` : "—", bar: recordBar(row.alan, row.opponent) },
          { key: "deciders", label: "Deciders", value: deciders ? `${row.decidersAlan}—${row.decidersOpponent}` : "—", bar: recordBar(row.decidersAlan, row.decidersOpponent) },
          { key: "run", label: "Current run", value: run.winner ? `${run.count} · ${players[run.winner].displayName}` : "—" },
        ]}
        note={`Values run ${names.alan}—${names.opponent}. ${row.played} finished match${row.played === 1 ? "" : "es"} recorded on ${surfaceLabels[sheet.surface].toLowerCase()}.`}
        onClose={onClose}
      >
        <button className="sheet-back" type="button" onClick={() => onChange({ kind: "surfaces" })}>
          <img src="./assets/icons/chevron-right.svg" alt="" aria-hidden="true" />
          All surfaces
        </button>
        <div className="sheet-form sheet-form-actions" aria-label={`${surfaceLabels[sheet.surface]} recent form`}>
          <span>Recent</span>
          {formMatches.length ? formMatches.map((item) => (
            <button
              type="button"
              key={item.matchId}
              style={{ background: players[item.winner].color }}
              onClick={() => onSelectMatch(item.match)}
              aria-label={`${players[item.winner].displayName} won match ${item.match.seq}. Open match detail`}
            >
              {players[item.winner].abbr}
            </button>
          )) : <em>No matches</em>}
        </div>
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "surfaces") {
    const rows = metricRows("match").map((row) => {
      const surface = row.key as Surface;
      return {
        ...row,
        onClick: () => onChange({ kind: "surface", surface }),
        ariaLabel: `${surfaceLabels[surface]} match record: ${names.alan} ${stats.surfaceSplit[surface].alan}, ${names.opponent} ${stats.surfaceSplit[surface].opponent}; ${stats.surfaceSplit[surface].played} finished ${stats.surfaceSplit[surface].played === 1 ? "match" : "matches"}. Open breakdown`,
      };
    });
    return <StatDetailSheet titleId="statDetailTitle" eyebrow="All courts" title="Surface tally" rows={rows} note="Surface records use finished matches only. Tap a court for set, rate, decider, run and recent-form detail." onClose={onClose} />;
  }

  const lead = stats.matchRecord.alan - stats.matchRecord.opponent;
  return (
    <StatDetailSheet
      titleId="statDetailTitle"
      eyebrow={sheet.kind === "timeline" ? "Match order" : "Rivalry story"}
      title={sheet.kind === "timeline" ? "Timeline" : "Match record"}
      rows={metricRows("match")}
      note={`Dates are recorded for ${stats.coverage.datedMatches} of ${stats.coverage.finishedMatches} finished matches; the curve therefore uses match order.`}
      onClose={onClose}
    >
      <LeadSparkline timeline={stats.timeline} matches={dataset.matches} players={players} ariaLabel="Cumulative match lead across the rivalry" />
      <SheetFacts facts={[
        ["Current gap", lead === 0 ? "Level" : `${Math.abs(lead)} · ${lead > 0 ? names.alan : names.opponent}`],
        [`${names.alan} max lead`, extremes.alan ? `+${extremes.alan.lead} · M${extremes.alan.seq}` : "Never led"],
        [`${names.opponent} max lead`, extremes.opponent ? `+${extremes.opponent.lead} · M${extremes.opponent.seq}` : "Never led"],
        ["Since last", cadence.daysSinceLast === null ? "—" : `${cadence.daysSinceLast}d`],
      ]} />
      <SheetFacts facts={[
        ["Dated matches", `${cadence.datedCount}/${stats.coverage.finishedMatches}`],
        ["Last 30 days", cadence.datedCount ? String(cadence.playedLast30) : "—"],
        ["Last 90 days", cadence.datedCount ? String(cadence.playedLast90) : "—"],
        ["Longest gap", cadence.longestGapDays === null ? "—" : `${cadence.longestGapDays}d`],
      ]} />
    </StatDetailSheet>
  );
}

function SheetFacts({ facts }: { facts: Array<[string, string]> }) {
  return (
    <div className="sheet-facts">
      {facts.map(([label, value]) => <div className="sheet-fact" key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>
  );
}

function formatPercentagePair(alan: number, opponent: number): Record<PlayerKey, string> {
  const total = alan + opponent;
  if (!total) return { alan: "0%", opponent: "0%" };
  const alanPercentage = Math.round((alan / total) * 100);
  return { alan: `${alanPercentage}%`, opponent: `${100 - alanPercentage}%` };
}
