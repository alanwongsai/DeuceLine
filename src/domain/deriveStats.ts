import { Cadence, DataCoverage, Match, MatchContext, MatchResult, OverviewStats, PlayerKey, SetScore, SURFACES, TimelinePoint } from "./schema";

const emptyRecord = (): Record<PlayerKey, number> => ({ alan: 0, opponent: 0 });

const surfaceRecord = () =>
  Object.fromEntries(
    SURFACES.map((surface) => [
      surface,
      { played: 0, alan: 0, opponent: 0, setsAlan: 0, setsOpponent: 0, decidersAlan: 0, decidersOpponent: 0 },
    ]),
  ) as OverviewStats["surfaceSplit"];

export function sortMatchesNewestFirst(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => b.seq - a.seq);
}

// A match suspended before a winner was decided. Excluded from every derived
// stat (record, sets, streaks, deciders, H2H, surface split) until completed.
export const isUnfinished = (match: Match): boolean => match.status === "unfinished";

export function deriveSetWinner(set: SetScore): PlayerKey {
  // Tied sets are rejected by validateDataset, so a strict comparison is safe.
  return set.alan > set.opponent ? "alan" : "opponent";
}

export function formatSetScore(set: SetScore): string {
  const base = `${set.alan}-${set.opponent}`;
  if (!set.tiebreak) return base;
  return `${base} (${set.tiebreak.alan}-${set.tiebreak.opponent})`;
}

function matchScoreFromSets(sets: SetScore[]): Record<PlayerKey, number> {
  const score = emptyRecord();
  sets.forEach((set) => {
    score[deriveSetWinner(set)] += 1;
  });
  return score;
}

export function deriveMatchResult(match: Match): MatchResult {
  const matchScore = match.fidelity === "sets" ? matchScoreFromSets(match.sets) : { ...match.matchScore };
  const totalSets = matchScore.alan + matchScore.opponent;
  const setScores = match.fidelity === "sets" ? match.sets.map(formatSetScore) : null;
  const hasSetDetail = match.fidelity === "sets";

  // An unfinished match has no winner yet — the running set tally is still
  // meaningful for display, but nothing is decided.
  if (isUnfinished(match)) {
    return { winner: null, isUnfinished: true, matchScore, setScores, hasSetDetail, isDecider: false };
  }

  return {
    // Tied match scores are rejected by validateDataset (for finished matches).
    winner: matchScore.alan > matchScore.opponent ? "alan" : "opponent",
    isUnfinished: false,
    matchScore,
    setScores,
    hasSetDetail,
    isDecider: totalSets >= 3 && Math.abs(matchScore.alan - matchScore.opponent) === 1,
  };
}

export function formatMatchScore(match: Match): string {
  const { matchScore } = deriveMatchResult(match);
  return `${matchScore.alan}—${matchScore.opponent}`;
}

// Scoreline read from the winner's perspective — tennis convention: "Andy won
// 2—1", sets "6-3 3-6 7-5", all winner-first. Views that lay out Alan-left /
// Andy-right (the detail set list, the H2H) keep the fixed orientation instead,
// because names and identity colours make that layout explicit.
export function formatWinnerScoreline(match: Match): {
  winner: PlayerKey;
  score: string;
  setScores: string[] | null;
} {
  const result = deriveMatchResult(match);
  if (result.winner === null) {
    // Fail loud: callers must branch on isUnfinished and use formatNeutralScoreline.
    throw new Error(`formatWinnerScoreline called on an unfinished match: ${match.id}`);
  }
  const loser: PlayerKey = result.winner === "alan" ? "opponent" : "alan";
  const setScores =
    match.fidelity !== "sets"
      ? null
      : match.sets.map((set) =>
          result.winner === "alan"
            ? formatSetScore(set)
            : formatSetScore({
                alan: set.opponent,
                opponent: set.alan,
                tiebreak: set.tiebreak
                  ? { alan: set.tiebreak.opponent, opponent: set.tiebreak.alan }
                  : undefined,
              }),
        );

  return {
    winner: result.winner,
    score: `${result.matchScore[result.winner]}—${result.matchScore[loser]}`,
    setScores,
  };
}

// Fixed Alan-left / Andy-right scoreline for an unfinished match — there is no
// winner to read from, so orientation is anchored and names/colours make it
// explicit. Set scores stay in the stored (Alan-first) orientation.
export function formatNeutralScoreline(match: Match): {
  alan: number;
  opponent: number;
  setScores: string[] | null;
} {
  const result = deriveMatchResult(match);
  return {
    alan: result.matchScore.alan,
    opponent: result.matchScore.opponent,
    setScores: match.fidelity === "sets" ? match.sets.map(formatSetScore) : null,
  };
}

// A derived result whose winner is known — unfinished matches are filtered out
// before this, so every stat below can index by winner without a null check.
type FinishedEntry = { match: Match; result: MatchResult & { winner: PlayerKey } };

export function deriveOverviewStats(matches: Match[]): OverviewStats {
  // Unfinished matches count toward nothing until completed: exclude them from
  // every record, streak, split and the played total. They still show in the
  // Matches list, which reads dataset.matches directly.
  const sortedMatches = sortMatchesNewestFirst(matches).filter((match) => !isUnfinished(match));
  // Compute each result once, then fold every stat from it in a single pass.
  const results = sortedMatches.map((match) => ({
    match,
    result: deriveMatchResult(match) as MatchResult & { winner: PlayerKey },
  })) as FinishedEntry[];

  const matchRecord = emptyRecord();
  const setRecord = emptyRecord();
  const deciderRecord = emptyRecord();
  const surfaceSplit = surfaceRecord();
  let detailedMatchCount = 0;

  for (const { match, result } of results) {
    matchRecord[result.winner] += 1;
    setRecord.alan += result.matchScore.alan;
    setRecord.opponent += result.matchScore.opponent;
    if (result.isDecider) deciderRecord[result.winner] += 1;
    if (result.hasSetDetail) detailedMatchCount += 1;
    surfaceSplit[match.surface].played += 1;
    surfaceSplit[match.surface][result.winner] += 1;
    surfaceSplit[match.surface].setsAlan += result.matchScore.alan;
    surfaceSplit[match.surface].setsOpponent += result.matchScore.opponent;
    if (result.isDecider) {
      surfaceSplit[match.surface][result.winner === "alan" ? "decidersAlan" : "decidersOpponent"] += 1;
    }
  }

  // results is already newest-first.
  const recentForm = results.slice(0, 5).map(({ match, result }) => ({
    matchId: match.id,
    winner: result.winner,
  }));

  const timeline = deriveTimeline(matches);

  const currentStreak = deriveCurrentStreak(results);
  const streakHistory = deriveStreakHistory(results);
  const surfaceStreak = Object.fromEntries(
    SURFACES.map((surface) => [surface, deriveCurrentStreak(results.filter((entry) => entry.match.surface === surface))]),
  ) as OverviewStats["surfaceStreak"];

  return {
    // Finished matches only — sortedMatches already excludes unfinished ones.
    totalMatches: sortedMatches.length,
    detailedMatchCount,
    matchRecord,
    setRecord,
    deciderRecord,
    currentStreak,
    recentForm,
    surfaceSplit,
    streakHistory,
    surfaceStreak,
    timeline,
    coverage: deriveDataCoverage(matches),
    sortedMatches,
  };
}

// Report which analytical dimensions are grounded in recorded raw input. An
// unfinished match has no settled result, so it is excluded just as it is from
// every other derived stat.
export function deriveDataCoverage(matches: Match[]): DataCoverage {
  const finished = matches.filter((match) => !isUnfinished(match));
  return {
    finishedMatches: finished.length,
    datedMatches: finished.filter((match) => match.date !== undefined).length,
    detailedScoreMatches: finished.filter((match) => match.fidelity === "sets").length,
    weatherMatches: finished.filter((match) => (match.conditions?.length ?? 0) > 0 || match.tempC !== undefined).length,
  };
}

// Context for one match: the head-to-head before and after it, the win streak
// it belongs to, and whether it snapped the other player's run. Chronological
// (seq-ascending) so "before"/"after" mean what they say.
export function deriveMatchContext(matches: Match[], matchId: string): MatchContext {
  const target = matches.find((match) => match.id === matchId);
  if (!target) throw new Error(`Unknown match id: ${matchId}`);
  // Domain-level guard (not just a UI convention): an unfinished match has no
  // winner, so it has no rivalry impact to derive. Refuse rather than leak a null.
  if (isUnfinished(target)) {
    throw new Error(`Cannot derive rivalry impact for an unfinished match: ${matchId}`);
  }

  // Records and "Match N of M" count decided matches only.
  const ordered = matches.filter((match) => !isUnfinished(match)).sort((a, b) => a.seq - b.seq);
  const index = ordered.findIndex((match) => match.id === matchId);

  const winners = ordered.map((match) => deriveMatchResult(match).winner as PlayerKey);
  const winner = winners[index];

  const recordBefore = emptyRecord();
  for (let i = 0; i < index; i += 1) recordBefore[winners[i]] += 1;
  const recordAfter = { ...recordBefore };
  recordAfter[winner] += 1;

  let streakCount = 0;
  for (let i = index; i >= 0 && winners[i] === winner; i -= 1) streakCount += 1;

  let snappedStreak: MatchContext["snappedStreak"] = null;
  if (index > 0 && winners[index - 1] !== winner) {
    const player = winners[index - 1];
    let count = 0;
    for (let i = index - 1; i >= 0 && winners[i] === player; i -= 1) count += 1;
    if (count >= 2) snappedStreak = { player, count };
  }

  return {
    matchNumber: index + 1,
    totalMatches: ordered.length,
    winner,
    recordBefore,
    recordAfter,
    streakAfter: { winner, count: streakCount },
    snappedStreak,
  };
}

// Groups newest-first results into consecutive-winner runs, newest run first.
function deriveStreakHistory(results: ReadonlyArray<{ result: { winner: PlayerKey } }>): OverviewStats["streakHistory"] {
  const runs: OverviewStats["streakHistory"] = [];
  for (const { result } of results) {
    const lastRun = runs[runs.length - 1];
    if (lastRun && lastRun.winner === result.winner) {
      lastRun.count += 1;
    } else {
      runs.push({ winner: result.winner, count: 1 });
    }
  }
  return runs;
}

function deriveCurrentStreak(results: ReadonlyArray<{ result: { winner: PlayerKey } }>): OverviewStats["currentStreak"] {
  if (results.length === 0) return { winner: null, count: 0 };

  const winner = results[0].result.winner;
  let count = 0;
  for (const { result } of results) {
    if (result.winner !== winner) break;
    count += 1;
  }
  return { winner, count };
}

// The rivalry built up match by match, oldest→newest. Ordered by seq (always
// present) so the lead curve reads left→right even when early matches have no
// date. Unfinished matches contribute nothing until completed.
export function deriveTimeline(matches: Match[]): TimelinePoint[] {
  const ordered = matches.filter((match) => !isUnfinished(match)).sort((a, b) => a.seq - b.seq);
  const cumulative = emptyRecord();
  const winners: PlayerKey[] = [];

  return ordered.map((match) => {
    const winner = deriveMatchResult(match).winner as PlayerKey;
    winners.push(winner);
    cumulative[winner] += 1;
    // Rolling form over the last up-to-five finished matches ending here.
    const window = winners.slice(-5);
    const alanWins = window.filter((w) => w === "alan").length;
    return {
      seq: match.seq,
      matchId: match.id,
      date: match.date ?? null,
      winner,
      cumulative: { ...cumulative },
      lead: cumulative.alan - cumulative.opponent,
      rollingWinRateAlan: alanWins / window.length,
    };
  });
}

const MS_PER_DAY = 86_400_000;

// Parse a `YYYY-MM-DD` string as a *local* calendar day (not UTC), so day-count
// arithmetic against `now` never drifts by a timezone offset.
function parseIsoDay(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// The date-derived rhythm of the rivalry. Only finished matches that carry a
// date feed the counts and gaps; undated early matches are tallied separately
// (`undatedCount`) and never assigned a guessed date. `now` is injected so the
// derivation stays pure and testable.
export function deriveCadence(matches: Match[], now: Date): Cadence {
  const finished = matches.filter((match) => !isUnfinished(match));
  const dated = finished
    .filter((match) => typeof match.date === "string")
    .map((match) => ({ date: match.date as string, day: parseIsoDay(match.date as string) }))
    .sort((a, b) => a.day.getTime() - b.day.getTime());
  const undatedCount = finished.length - dated.length;

  if (dated.length === 0) {
    return {
      datedCount: 0,
      undatedCount,
      lastMatchDate: null,
      daysSinceLast: null,
      playedLast30: 0,
      playedLast90: 0,
      longestGapDays: null,
      longestGap: null,
    };
  }

  const today = startOfDay(now).getTime();
  const last = dated[dated.length - 1];
  const daysAgo = (day: Date) => Math.round((today - day.getTime()) / MS_PER_DAY);
  const within = (days: number) =>
    dated.filter((entry) => {
      const ago = daysAgo(entry.day);
      return ago >= 0 && ago <= days;
    }).length;

  let longestGapDays: number | null = null;
  let longestGap: Cadence["longestGap"] = null;
  for (let i = 1; i < dated.length; i += 1) {
    const gap = Math.round((dated[i].day.getTime() - dated[i - 1].day.getTime()) / MS_PER_DAY);
    if (longestGapDays === null || gap > longestGapDays) {
      longestGapDays = gap;
      longestGap = { fromDate: dated[i - 1].date, toDate: dated[i].date };
    }
  }

  return {
    datedCount: dated.length,
    undatedCount,
    lastMatchDate: last.date,
    daysSinceLast: daysAgo(last.day),
    playedLast30: within(30),
    playedLast90: within(90),
    longestGapDays,
    longestGap,
  };
}
