import { Match, MatchResult, OverviewStats, PlayerKey, SetScore, SURFACES } from "./schema";

const emptyRecord = (): Record<PlayerKey, number> => ({ alan: 0, opponent: 0 });

const surfaceRecord = () =>
  Object.fromEntries(SURFACES.map((surface) => [surface, { played: 0, alan: 0, opponent: 0 }])) as OverviewStats["surfaceSplit"];

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
  }

  // results is already newest-first.
  const recentForm = results.slice(0, 5).map(({ match, result }) => ({
    matchId: match.id,
    winner: result.winner,
  }));

  const currentStreak = deriveCurrentStreak(results);

  return {
    totalMatches: matches.length,
    detailedMatchCount,
    matchRecord,
    setRecord,
    deciderRecord,
    currentStreak,
    recentForm,
    surfaceSplit,
    sortedMatches,
  };
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
