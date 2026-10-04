import { ReactNode } from "react";
import { PlayerComparison } from "./PlayerComparison";
import { identityColor, identityTextStyle } from "./identityStyle";
import {
  deriveCadence,
  deriveFirstSetConversion,
  deriveGamesTally,
  deriveScorelineDistribution,
  deriveSurfaceForm,
  formatWinnerScoreline,
  longestRun,
  maxLead,
} from "../domain/deriveStats";
import { deriveNextMatchLean, LeanFactor } from "../domain/narrative";
import { DeucelineDataset, Match, OverviewStats, PlayerKey, Surface, SURFACES } from "../domain/schema";
import { LeadSparkline } from "./LeadSparkline";
import { DetailRow, StatDetailSheet } from "./StatDetailSheet";

export type OverviewSheetState =
  | { kind: "story" | "setRecord" | "deciders" | "conversion" | "streak" | "form" | "timeline" | "surfaces" }
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

type Metric = "match" | "sets" | "rate";

export function OverviewSheets({ sheet, dataset, stats, onChange, onSelectMatch, onClose }: OverviewSheetsProps) {
  const players = dataset.rivalry.players;
  const names = { alan: players.alan.displayName, opponent: players.opponent.displayName };
  const surfaces = [...SURFACES].sort((a, b) => stats.surfaceSplit[b].played - stats.surfaceSplit[a].played);
  const games = deriveGamesTally(dataset.matches);
  const distribution = deriveScorelineDistribution(dataset.matches);
  const conversion = deriveFirstSetConversion(dataset.matches);
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
          leftColor: identityColor("alan"),
          rightColor: identityColor("opponent"),
        }
      : undefined;
  };
  const metricRows = (metric: Metric): DetailRow[] =>
    surfaces.map((surface) => {
      const row = stats.surfaceSplit[surface];
      const alan = metric === "sets" ? row.setsAlan : row.alan;
      const opponent = metric === "sets" ? row.setsOpponent : row.opponent;
      const sample = row.played;
      const rowRates = formatPercentagePair(row.alan, row.opponent);
      const value = metric === "rate"
        ? row.played ? <PlayerComparison alan={rowRates.alan} opponent={rowRates.opponent} separator=" · " /> : "—"
        : sample ? <PlayerComparison alan={alan} opponent={opponent} /> : "—";
      return { key: surface, surface, label: surfaceLabels[surface], meta: sample ? String(sample) : undefined, value, bar: recordBar(alan, opponent), isEmpty: sample === 0 };
    });

  if (sheet.kind === "setRecord") {
    const setTotal = stats.setRecord.alan + stats.setRecord.opponent;
    return (
      <StatDetailSheet
        titleId="statDetailTitle"
        eyebrow="Score evidence"
        title="Set record"
        rows={[
          { key: "games", label: "Known games", meta: `${games.detailedMatchCount}/${games.finishedMatchCount}`, value: games.detailedMatchCount ? <PlayerComparison alan={games.games.alan} opponent={games.games.opponent} /> : "—", bar: recordBar(games.games.alan, games.games.opponent) },
          { key: "margin", label: "Biggest set margin", value: games.biggestSetMargin ? `${games.biggestSetMargin.score} · ${players[games.biggestSetMargin.winner].displayName}` : "—" },
          ...metricRows("sets"),
        ]}
        note={`Full sets only — a super tiebreak is ten points, so it is counted under Deciders instead. Games are based on ${games.detailedMatchCount} of ${games.finishedMatchCount} finished matches with full set scores.`}
        onClose={onClose}
      >
        <SheetFacts
          facts={[
            ["Set share", setTotal ? <PlayerComparison alan={`${Math.round((stats.setRecord.alan / setTotal) * 100)}%`} opponent={`${Math.round((stats.setRecord.opponent / setTotal) * 100)}%`} separator=" · " /> : "—"],
            ["Straight sets", <PlayerComparison alan={distribution.straightSets.alan} opponent={distribution.straightSets.opponent} />],
            ["Deciders won", <PlayerComparison alan={distribution.deciders.alan} opponent={distribution.deciders.opponent} />],
            ["Super tiebreaks", <PlayerComparison alan={distribution.superTiebreak.record.alan} opponent={distribution.superTiebreak.record.opponent} />],
          ]}
        />
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "form") {
    const latestRolling = stats.timeline.at(-1)?.rollingWinRateAlan;
    return (
      <StatDetailSheet titleId="statDetailTitle" eyebrow="Match-order form" title="Recent form" rows={metricRows("rate")} onClose={onClose}>
        <div className="sheet-form sheet-form-actions" aria-label="Last five matches, newest first">
          <span>Last five</span>
          {recentMatches.length ? recentMatches.map((item) => (
            <button
              type="button"
              key={item.matchId}
              style={{ background: identityColor(item.winner) }}
              onClick={() => onSelectMatch(item.match)}
              aria-label={`${players[item.winner].displayName} won match ${item.match.seq}. Open match detail`}
            >
              {players[item.winner].abbr}
            </button>
          )) : <em>No finished matches</em>}
        </div>
        <LeadSparkline timeline={stats.timeline} matches={dataset.matches} players={players} mode="rolling" ariaLabel={`Rolling five-match win share for ${names.alan}`} />
        <SheetFacts facts={[
          ["All matches", <PlayerComparison alan={winRate.alan} opponent={winRate.opponent} separator=" · " />],
          ["Last five", <PlayerComparison alan={recent.alan} opponent={recent.opponent} />],
          ["Latest rolling", latestRolling === undefined ? "—" : `${Math.round(latestRolling * 100)}% ${names.alan}`],
          ["Evidence", `${stats.totalMatches} matches`],
        ]} />
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "deciders") {
    const { byShape, superTiebreak } = distribution;
    const closest = superTiebreak.closest;
    const closestMatch = closest ? dataset.matches.find((match) => match.id === closest.matchId) : undefined;
    const shapeRow = (key: string, label: string, record: Record<PlayerKey, number>, meta?: string): DetailRow => {
      const sample = record.alan + record.opponent;
      return { key, label, meta, value: sample ? <PlayerComparison alan={record.alan} opponent={record.opponent} /> : "—", bar: recordBar(record.alan, record.opponent), isEmpty: sample === 0 };
    };
    const rows: DetailRow[] = [
      shapeRow("superTiebreak", "Super tiebreak", byShape.superTiebreak, "Laver Cup"),
      shapeRow("thirdSet", "Third set", byShape.thirdSet, "older format"),
      ...(byShape.scoreOnlyDecider.alan + byShape.scoreOnlyDecider.opponent
        ? [shapeRow("scoreOnly", "Unrecorded decider", byShape.scoreOnlyDecider, "set tally only")]
        : []),
      ...(closest && closestMatch
        ? [{
            key: "closest",
            label: "Closest super tiebreak",
            meta: `M${closest.seq}`,
            value: `${closest.score} · ${players[closest.winner].displayName}`,
            onClick: () => onSelectMatch(closestMatch),
            ariaLabel: `Closest super tiebreak: ${players[closest.winner].displayName} won ${closest.score} in match ${closest.seq}. Open match detail`,
          }]
        : []),
    ];
    return (
      <StatDetailSheet
        titleId="statDetailTitle"
        eyebrow="Pressure points"
        title="Deciders"
        rows={rows}
        note={`Values run ${names.alan}—${names.opponent}. A decider is a match that reached one set all. Since the Laver Cup format, that is a super tiebreak (first to 10, win by 2); older matches played a full third set.`}
        onClose={onClose}
      >
        <SheetFacts facts={[
          [`${names.alan}—${names.opponent}`, distribution.deciderCount ? <PlayerComparison alan={distribution.deciders.alan} opponent={distribution.deciders.opponent} /> : "—"],
          ["Decider rate", distribution.finishedMatchCount ? `${Math.round((distribution.deciderCount / distribution.finishedMatchCount) * 100)}% · ${distribution.deciderCount}/${distribution.finishedMatchCount}` : "—"],
          ["Straight-set wins", <PlayerComparison alan={distribution.straightSets.alan} opponent={distribution.straightSets.opponent} />],
          ["Super TB points", superTiebreak.points.alan + superTiebreak.points.opponent ? <PlayerComparison alan={superTiebreak.points.alan} opponent={superTiebreak.points.opponent} /> : "—"],
        ]} />
      </StatDetailSheet>
    );
  }

  if (sheet.kind === "conversion") {
    const comebackMatches = conversion.comebackMatchIds
      .map((id) => dataset.matches.find((match) => match.id === id))
      .filter((match): match is Match => match !== undefined);
    const conversionRow = (player: PlayerKey): DetailRow => {
      const won = conversion.firstSetWins[player];
      const kept = conversion.converted[player];
      return {
        key: player,
        identity: player,
        label: `${players[player].displayName} after winning set 1`,
        value: won ? `${kept}/${won} · ${Math.round((kept / won) * 100)}%` : "—",
        bar: won
          ? {
              leftPct: player === "alan" ? (kept / won) * 100 : 0,
              rightPct: player === "opponent" ? (kept / won) * 100 : 0,
              leftColor: identityColor("alan"),
              rightColor: identityColor("opponent"),
            }
          : undefined,
        isEmpty: won === 0,
      };
    };
    const rows: DetailRow[] = [
      conversionRow("alan"),
      conversionRow("opponent"),
      ...comebackMatches.map((match) => {
        const winner = formatWinnerScoreline(match);
        return {
          key: match.id,
          label: `Comeback · M${match.seq}`,
          meta: match.date ? shortDate(match.date) : undefined,
          value: `${players[winner.winner].displayName} · ${winner.setScores?.join(" ") ?? winner.score}`,
          onClick: () => onSelectMatch(match),
          ariaLabel: `${players[winner.winner].displayName} came back from a set down in match ${match.seq}. Open match detail`,
        };
      }),
    ];
    return (
      <StatDetailSheet
        titleId="statDetailTitle"
        eyebrow="Set-one momentum"
        title="1st-set conversion"
        rows={rows}
        note={`How often the first-set winner went on to win the match. Based on ${conversion.sample} of ${conversion.finishedMatchCount} finished matches with set scores; comebacks are matches won from a set down, newest first.`}
        onClose={onClose}
      >
        <SheetFacts facts={[
          [`${names.alan} kept`, `${conversion.converted.alan}/${conversion.firstSetWins.alan}`],
          [`${names.opponent} kept`, `${conversion.converted.opponent}/${conversion.firstSetWins.opponent}`],
          ["Comebacks", <PlayerComparison alan={conversion.comebacks.alan} opponent={conversion.comebacks.opponent} />],
          ["Evidence", `${conversion.sample} matches`],
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
        identity: run.winner,
        label: players[run.winner].displayName,
        value: `${run.count} in a row`,
        bar: {
          leftPct: run.winner === "alan" ? (run.count / scale) * 100 : 0,
          rightPct: run.winner === "opponent" ? (run.count / scale) * 100 : 0,
          leftColor: identityColor("alan"),
          rightColor: identityColor("opponent"),
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
          { key: "matches", label: "Match record", value: row.played ? <PlayerComparison alan={row.alan} opponent={row.opponent} /> : "—", bar: recordBar(row.alan, row.opponent) },
          { key: "sets", label: "Set record", value: row.played ? <PlayerComparison alan={row.setsAlan} opponent={row.setsOpponent} /> : "—", bar: recordBar(row.setsAlan, row.setsOpponent) },
          { key: "rate", label: "Win rate", value: row.played ? <PlayerComparison alan={surfaceRates.alan} opponent={surfaceRates.opponent} separator=" · " /> : "—", bar: recordBar(row.alan, row.opponent) },
          { key: "deciders", label: "Deciders", value: deciders ? <PlayerComparison alan={row.decidersAlan} opponent={row.decidersOpponent} /> : "—", bar: recordBar(row.decidersAlan, row.decidersOpponent) },
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
              style={{ background: identityColor(item.winner) }}
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
      {sheet.kind === "story" ? <LeanSummary dataset={dataset} /> : null}
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

const leanFactorLabels: Record<LeanFactor["key"], string> = {
  headToHead: "Head-to-head",
  recentForm: "Last five",
  surface: "On this court",
  superTiebreaks: "Super tiebreaks",
};

// The next-match lean and every factor behind it, so the handnote's one-line
// verdict is never a black box.
function LeanSummary({ dataset }: { dataset: DeucelineDataset }) {
  const lean = deriveNextMatchLean(dataset.matches);
  if (!lean) return null;
  const players = dataset.rivalry.players;
  const verdict = lean.verdict === "tossUp" || !lean.favourite
    ? "A toss-up"
    : `${players[lean.favourite].displayName} ${lean.verdict === "slightEdge" ? "slightly favoured" : "favoured"}`;
  return (
    <section className="sheet-lean" aria-label="Next-match lean">
      <p className="sheet-lean-verdict"><span>Next match</span><strong style={lean.favourite ? identityTextStyle(lean.favourite) : undefined}>{verdict}</strong></p>
      <SheetFacts facts={lean.factors.map((factor): [string, ReactNode] => {
        const label = factor.key === "surface" ? `On ${surfaceLabels[lean.surface]}` : leanFactorLabels[factor.key];
        const sample = factor.record.alan + factor.record.opponent;
        const value = !factor.counted
          ? sample ? <><PlayerComparison alan={factor.record.alan} opponent={factor.record.opponent} /> · too few</> : "—"
          : <><PlayerComparison alan={factor.record.alan} opponent={factor.record.opponent} />{factor.favours ? ` · ${players[factor.favours].abbr}` : " · even"}</>;
        return [`${label} ${Math.round(factor.weight * 100)}%`, value];
      })} />
    </section>
  );
}

function SheetFacts({ facts }: { facts: Array<[string, ReactNode]> }) {
  return (
    <div className="sheet-facts">
      {facts.map(([label, value]) => <div className="sheet-fact" key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>
  );
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatPercentagePair(alan: number, opponent: number): Record<PlayerKey, string> {
  const total = alan + opponent;
  if (!total) return { alan: "0%", opponent: "0%" };
  const alanPercentage = Math.round((alan / total) * 100);
  return { alan: `${alanPercentage}%`, opponent: `${100 - alanPercentage}%` };
}
