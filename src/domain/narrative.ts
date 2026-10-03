// The Overview handnote: a short, derived story of where the rivalry stands,
// plus a transparent lean for the next match. Everything here is recomputed
// from raw matches on every render — nothing is stored. Display names are
// passed in so the mini program can reuse the same wording.

import {
  deriveFirstSetConversion,
  deriveMatchContext,
  deriveMatchResult,
  deriveMatchShape,
  deriveOverviewStats,
  deriveSetWinner,
  isUnfinished,
  sortMatchesNewestFirst,
} from "./deriveStats";
import { Match, PlayerKey, Surface } from "./schema";

export type LeanVerdict = "tossUp" | "slightEdge" | "edge";

export type LeanFactor = {
  key: "headToHead" | "recentForm" | "surface" | "superTiebreaks";
  record: Record<PlayerKey, number>;
  // Who this factor points to; null when level or when the sample is too small.
  favours: PlayerKey | null;
  // False when the sample is below the factor's minimum, so it is shown but not weighed.
  counted: boolean;
  weight: number;
};

export type NextMatchLean = {
  verdict: LeanVerdict;
  favourite: PlayerKey | null;
  // Weighted balance in [-1, 1]; positive leans Alan.
  balance: number;
  // The court the lean assumes: the latest finished match's surface.
  surface: Surface;
  factors: LeanFactor[];
};

// Weights sum to 1. Recent form leads because the rivalry has swung in runs;
// super tiebreaks are a small, pressure-only signal.
const LEAN_FACTORS: ReadonlyArray<{ key: LeanFactor["key"]; weight: number; minSample: number }> = [
  { key: "headToHead", weight: 0.3, minSample: 1 },
  { key: "recentForm", weight: 0.35, minSample: 1 },
  { key: "surface", weight: 0.25, minSample: 2 },
  { key: "superTiebreaks", weight: 0.1, minSample: 2 },
];

// |balance| below TOSS_UP reads as a toss-up; below EDGE as a slight edge.
const TOSS_UP = 0.1;
const EDGE = 0.25;

const emptyRecord = (): Record<PlayerKey, number> => ({ alan: 0, opponent: 0 });
const other = (player: PlayerKey): PlayerKey => (player === "alan" ? "opponent" : "alan");

export function deriveNextMatchLean(matches: Match[]): NextMatchLean | null {
  const stats = deriveOverviewStats(matches);
  const latest = stats.sortedMatches[0];
  if (!latest) return null;

  const recent = emptyRecord();
  stats.recentForm.forEach((item) => {
    recent[item.winner] += 1;
  });
  const surfaceRow = stats.surfaceSplit[latest.surface];
  const superTiebreaks = emptyRecord();
  stats.sortedMatches.forEach((match) => {
    if (match.fidelity === "sets" && match.matchTiebreak) superTiebreaks[deriveSetWinner(match.matchTiebreak)] += 1;
  });

  const records: Record<LeanFactor["key"], Record<PlayerKey, number>> = {
    headToHead: stats.matchRecord,
    recentForm: recent,
    surface: { alan: surfaceRow.alan, opponent: surfaceRow.opponent },
    superTiebreaks,
  };

  let balance = 0;
  const factors = LEAN_FACTORS.map(({ key, weight, minSample }) => {
    const record = records[key];
    const sample = record.alan + record.opponent;
    const counted = sample >= minSample;
    const share = sample ? (record.alan - record.opponent) / sample : 0;
    if (counted) balance += weight * share;
    const favours: PlayerKey | null = !counted || share === 0 ? null : share > 0 ? "alan" : "opponent";
    return { key, record, favours, counted, weight };
  });

  const magnitude = Math.abs(balance);
  const verdict: LeanVerdict = magnitude < TOSS_UP ? "tossUp" : magnitude < EDGE ? "slightEdge" : "edge";
  return {
    verdict,
    favourite: verdict === "tossUp" ? null : balance > 0 ? "alan" : "opponent",
    balance,
    surface: latest.surface,
    factors,
  };
}

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const numberWord = (value: number): string => NUMBER_WORDS[value] ?? String(value);
const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

// What the latest finished match did, in one line.
function headline(match: Match, names: Record<PlayerKey, string>, cameBack: boolean): string {
  const winner = deriveMatchResult(match).winner as PlayerKey;
  const name = names[winner];
  const court = `on ${titleCase(match.surface)}`;
  switch (deriveMatchShape(match)) {
    case "superTiebreak": {
      const points = (match as Extract<Match, { fidelity: "sets" }>).matchTiebreak!;
      const score = `${points[winner]}–${points[other(winner)]}`;
      return `${name} wins the super tiebreak ${score} ${court}${cameBack ? ", from a set down" : ""}.`;
    }
    case "thirdSet":
      return cameBack ? `${name} comes back from a set down ${court}.` : `${name} wins a third-set decider ${court}.`;
    case "straight":
      return `${name} wins in straight sets ${court}.`;
    case "scoreOnlyDecider":
      return `${name} wins a deciding set ${court}.`;
    default:
      return `${name} wins ${court}.`;
  }
}

// Where the head-to-head stands after the latest match, from its winner's view.
// `afterRun` drops the winner's name when the line already opened with it
// ("Two in a row for Alan — the lead grows to 7–4").
function standing(
  winner: PlayerKey,
  before: Record<PlayerKey, number>,
  after: Record<PlayerKey, number>,
  names: Record<PlayerKey, string>,
  afterRun: boolean,
): string {
  if (after.alan === after.opponent) return `level at ${after.alan}–${after.opponent}`;
  const leader: PlayerKey = after.alan > after.opponent ? "alan" : "opponent";
  const score = `${after[leader]}–${after[other(leader)]}`;
  if (leader !== winner) return `${names[leader]} still leads ${score}`;
  const extending = before[winner] > before[other(winner)];
  if (afterRun) return extending ? `the lead grows to ${score}` : `now ahead ${score}`;
  return extending ? `${names[winner]} extends the lead to ${score}` : `${names[winner]} moves ahead ${score}`;
}

function leanLine(lean: NextMatchLean, names: Record<PlayerKey, string>): string {
  if (lean.verdict === "tossUp" || !lean.favourite) return "Next match: a toss-up.";
  return lean.verdict === "slightEdge"
    ? `Next match: ${names[lean.favourite]} slightly favoured.`
    : `Next match: ${names[lean.favourite]} favoured.`;
}

// Three lines — what just happened, where it stands, the lean — or none when
// there is no finished match to tell a story about.
export function deriveRivalryNote(matches: Match[], names: Record<PlayerKey, string>): string[] {
  const latest = sortMatchesNewestFirst(matches).find((match) => !isUnfinished(match));
  const lean = deriveNextMatchLean(matches);
  if (!latest || !lean) return [];

  const context = deriveMatchContext(matches, latest.id);
  const cameBack = deriveFirstSetConversion([latest]).comebackMatchIds.length > 0;
  const run = context.streakAfter.count;
  const where = standing(context.winner, context.recordBefore, context.recordAfter, names, run >= 2);
  const second = run >= 2
    ? `${numberWord(run)} in a row for ${names[context.winner]} — ${where}.`
    : `${titleCase(where)}.`;

  return [headline(latest, names, cameBack), second, leanLine(lean, names)];
}
