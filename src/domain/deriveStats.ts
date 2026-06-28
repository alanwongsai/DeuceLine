import { Match, MatchResult, OverviewStats, PlayerKey, Surface, SURFACES } from "./schema";

const surfaceRecord = () =>
  Object.fromEntries(SURFACES.map((surface) => [surface, { played: 0, alan: 0, opponent: 0 }])) as OverviewStats["surfaceSplit"];

export function sortMatchesNewestFirst(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => b.date.localeCompare(a.date));
}

export function deriveSetWinner(set: Match["sets"][number]): PlayerKey {
  return set.alan > set.opponent ? "alan" : "opponent";
}

export function formatSetScore(set: Match["sets"][number]): string {
  const base = `${set.alan}-${set.opponent}`;
  if (!set.tiebreak) return base;
  return `${base} (${set.tiebreak.alan}-${set.tiebreak.opponent})`;
}

export function deriveMatchResult(match: Match): MatchResult {
  const matchScore: Record<PlayerKey, number> = { alan: 0, opponent: 0 };

  match.sets.forEach((set) => {
    matchScore[deriveSetWinner(set)] += 1;
  });

  return {
    winner: matchScore.alan > matchScore.opponent ? "alan" : "opponent",
    matchScore,
    setScores: match.sets.map(formatSetScore),
    isDecider: match.sets.length >= 3 && Math.abs(matchScore.alan - matchScore.opponent) === 1,
  };
}

export function formatMatchScore(match: Match): string {
  const result = deriveMatchResult(match);
  return `${result.matchScore.alan}\u2014${result.matchScore.opponent}`;
}

export function deriveMatchRecord(matches: Match[]): Record<PlayerKey, number> {
  return matches.reduce(
    (record, match) => {
      record[deriveMatchResult(match).winner] += 1;
      return record;
    },
    { alan: 0, opponent: 0 },
  );
}

export function deriveSetRecord(matches: Match[]): Record<PlayerKey, number> {
  return matches.reduce(
    (record, match) => {
      const result = deriveMatchResult(match);
      record.alan += result.matchScore.alan;
      record.opponent += result.matchScore.opponent;
      return record;
    },
    { alan: 0, opponent: 0 },
  );
}

export function deriveRecentForm(matches: Match[], limit = 5): OverviewStats["recentForm"] {
  return sortMatchesNewestFirst(matches)
    .slice(0, limit)
    .map((match) => ({
      matchId: match.id,
      winner: deriveMatchResult(match).winner,
    }));
}

export function deriveCurrentStreak(matches: Match[]): OverviewStats["currentStreak"] {
  const sorted = sortMatchesNewestFirst(matches);
  if (sorted.length === 0) return { winner: null, count: 0 };

  const winner = deriveMatchResult(sorted[0]).winner;
  let count = 0;

  for (const match of sorted) {
    if (deriveMatchResult(match).winner !== winner) break;
    count += 1;
  }

  return { winner, count };
}

export function deriveSurfaceSplit(matches: Match[]): OverviewStats["surfaceSplit"] {
  return matches.reduce((split, match) => {
    const surface: Surface = match.surface;
    const winner = deriveMatchResult(match).winner;
    split[surface].played += 1;
    split[surface][winner] += 1;
    return split;
  }, surfaceRecord());
}

export function deriveDeciderRecord(matches: Match[]): Record<PlayerKey, number> {
  return matches.reduce(
    (record, match) => {
      const result = deriveMatchResult(match);
      if (result.isDecider) record[result.winner] += 1;
      return record;
    },
    { alan: 0, opponent: 0 },
  );
}

export function deriveOverviewStats(matches: Match[]): OverviewStats {
  const sortedMatches = sortMatchesNewestFirst(matches);

  return {
    totalMatches: matches.length,
    matchRecord: deriveMatchRecord(matches),
    setRecord: deriveSetRecord(matches),
    deciderRecord: deriveDeciderRecord(matches),
    currentStreak: deriveCurrentStreak(matches),
    recentForm: deriveRecentForm(matches),
    surfaceSplit: deriveSurfaceSplit(matches),
    sortedMatches,
  };
}
