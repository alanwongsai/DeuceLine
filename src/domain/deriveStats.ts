import { Match, MatchContext, MatchResult, OverviewStats, PlayerKey, SetScore, SURFACES } from "./schema";

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

  return {
    // Tied match scores are rejected by validateDataset.
    winner: matchScore.alan > matchScore.opponent ? "alan" : "opponent",
    matchScore,
    setScores: match.fidelity === "sets" ? match.sets.map(formatSetScore) : null,
    hasSetDetail: match.fidelity === "sets",
    isDecider: totalSets >= 3 && Math.abs(matchScore.alan - matchScore.opponent) === 1,
  };
}

export function formatMatchScore(match: Match): string {
  const { matchScore } = deriveMatchResult(match);
  return `${matchScore.alan}—${matchScore.opponent}`;
}

export function deriveOverviewStats(matches: Match[]): OverviewStats {
  const sortedMatches = sortMatchesNewestFirst(matches);
  // Compute each result once, then fold every stat from it in a single pass.
  const results = sortedMatches.map((match) => ({ match, result: deriveMatchResult(match) }));

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

  const currentStreak = deriveCurrentStreak(results);
  const streakHistory = deriveStreakHistory(results);
  const surfaceStreak = Object.fromEntries(
    SURFACES.map((surface) => [surface, deriveCurrentStreak(results.filter((entry) => entry.match.surface === surface))]),
  ) as OverviewStats["surfaceStreak"];

  return {
    totalMatches: matches.length,
    detailedMatchCount,
    matchRecord,
    setRecord,
    deciderRecord,
    currentStreak,
    recentForm,
    surfaceSplit,
    streakHistory,
    surfaceStreak,
    sortedMatches,
  };
}

// Context for one match: the head-to-head before and after it, the win streak
// it belongs to, and whether it snapped the other player's run. Chronological
// (seq-ascending) so "before"/"after" mean what they say.
export function deriveMatchContext(matches: Match[], matchId: string): MatchContext {
  const ordered = [...matches].sort((a, b) => a.seq - b.seq);
  const index = ordered.findIndex((match) => match.id === matchId);
  if (index === -1) throw new Error(`Unknown match id: ${matchId}`);

  const winners = ordered.map((match) => deriveMatchResult(match).winner);
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
function deriveStreakHistory(results: Array<{ result: MatchResult }>): OverviewStats["streakHistory"] {
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

function deriveCurrentStreak(results: Array<{ result: MatchResult }>): OverviewStats["currentStreak"] {
  if (results.length === 0) return { winner: null, count: 0 };

  const winner = results[0].result.winner;
  let count = 0;
  for (const { result } of results) {
    if (result.winner !== winner) break;
    count += 1;
  }
  return { winner, count };
}
