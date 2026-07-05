import { describe, expect, it } from "vitest";
import { DetailedMatch, Match, ScoreMatch } from "./schema";
import {
  deriveMatchContext,
  deriveMatchResult,
  deriveOverviewStats,
  formatMatchScore,
  formatNeutralScoreline,
  formatWinnerScoreline,
  isUnfinished,
  sortMatchesNewestFirst,
} from "./deriveStats";

const detailed = (seq: number, surface: Match["surface"], sets: DetailedMatch["sets"]): DetailedMatch => ({
  id: `d-${seq}`,
  seq,
  surface,
  fidelity: "sets",
  sets,
});

const score = (seq: number, surface: Match["surface"], alan: number, opponent: number): ScoreMatch => ({
  id: `s-${seq}`,
  seq,
  surface,
  fidelity: "matchScore",
  matchScore: { alan, opponent },
});

// The seven real Bishop matches, defined out of chronological order on purpose
// so the tests also exercise seq-based sorting.
const bishop: Match[] = [
  score(2, "astro", 0, 2),
  score(1, "astro", 1, 2),
  score(4, "clay", 2, 0),
  score(3, "hard", 2, 1),
  score(6, "clay", 1, 2),
  score(5, "clay", 2, 0),
  detailed(7, "clay", [
    { alan: 6, opponent: 3 },
    { alan: 3, opponent: 6 },
    { alan: 7, opponent: 5 },
  ]),
];

describe("deriveMatchResult", () => {
  it("counts set winners for detailed matches", () => {
    const result = deriveMatchResult(
      detailed(1, "clay", [
        { alan: 6, opponent: 3 },
        { alan: 3, opponent: 6 },
        { alan: 7, opponent: 5 },
      ]),
    );
    expect(result.winner).toBe("alan");
    expect(result.matchScore).toEqual({ alan: 2, opponent: 1 });
    expect(result.setScores).toEqual(["6-3", "3-6", "7-5"]);
    expect(result.hasSetDetail).toBe(true);
    expect(result.isDecider).toBe(true);
  });

  it("uses the stored tally for score-only matches and has no per-set detail", () => {
    const result = deriveMatchResult(score(1, "astro", 0, 2));
    expect(result.winner).toBe("opponent");
    expect(result.matchScore).toEqual({ alan: 0, opponent: 2 });
    expect(result.setScores).toBeNull();
    expect(result.hasSetDetail).toBe(false);
    expect(result.isDecider).toBe(false);
  });

  it("renders tiebreak scores in the per-set line", () => {
    const result = deriveMatchResult(
      detailed(1, "hard", [
        { alan: 7, opponent: 6, tiebreak: { alan: 7, opponent: 4 } },
        { alan: 6, opponent: 2 },
      ]),
    );
    expect(result.setScores).toEqual(["7-6 (7-4)", "6-2"]);
  });

  it("flags a 2-1 score match as a decider but not a 2-0", () => {
    expect(deriveMatchResult(score(1, "clay", 2, 1)).isDecider).toBe(true);
    expect(deriveMatchResult(score(2, "clay", 2, 0)).isDecider).toBe(false);
  });
});

describe("formatMatchScore", () => {
  it("formats with an em dash", () => {
    expect(formatMatchScore(score(1, "clay", 2, 1))).toBe("2—1");
  });
});

describe("formatWinnerScoreline", () => {
  it("keeps Alan-first ordering when Alan wins", () => {
    const scoreline = formatWinnerScoreline(
      detailed(1, "clay", [
        { alan: 6, opponent: 3 },
        { alan: 3, opponent: 6 },
        { alan: 7, opponent: 5 },
      ]),
    );
    expect(scoreline.winner).toBe("alan");
    expect(scoreline.score).toBe("2—1");
    expect(scoreline.setScores).toEqual(["6-3", "3-6", "7-5"]);
  });

  it("flips the score and set lines when the opponent wins", () => {
    const scoreline = formatWinnerScoreline(
      detailed(1, "hard", [
        { alan: 3, opponent: 6 },
        { alan: 6, opponent: 7, tiebreak: { alan: 4, opponent: 7 } },
      ]),
    );
    expect(scoreline.winner).toBe("opponent");
    expect(scoreline.score).toBe("2—0");
    expect(scoreline.setScores).toEqual(["6-3", "7-6 (7-4)"]);
  });

  it("flips a score-only tally and has no set lines", () => {
    const scoreline = formatWinnerScoreline(score(1, "astro", 1, 2));
    expect(scoreline.winner).toBe("opponent");
    expect(scoreline.score).toBe("2—1");
    expect(scoreline.setScores).toBeNull();
  });
});

describe("sortMatchesNewestFirst", () => {
  it("orders by seq descending regardless of dates", () => {
    expect(sortMatchesNewestFirst(bishop).map((m) => m.seq)).toEqual([7, 6, 5, 4, 3, 2, 1]);
  });
});

describe("deriveOverviewStats (full Bishop rivalry)", () => {
  const stats = deriveOverviewStats(bishop);

  it("computes the match record", () => {
    expect(stats.matchRecord).toEqual({ alan: 4, opponent: 3 });
  });

  it("computes the set record across both fidelity levels", () => {
    expect(stats.setRecord).toEqual({ alan: 10, opponent: 8 });
  });

  it("computes the decider record", () => {
    expect(stats.deciderRecord).toEqual({ alan: 2, opponent: 2 });
  });

  it("reports the current streak as Alan W1", () => {
    expect(stats.currentStreak).toEqual({ winner: "alan", count: 1 });
  });

  it("counts how many matches have full set detail", () => {
    expect(stats.detailedMatchCount).toBe(1);
    expect(stats.totalMatches).toBe(7);
  });

  it("splits results by surface, including the per-surface set and decider tally", () => {
    expect(stats.surfaceSplit.astro).toEqual({
      played: 2,
      alan: 0,
      opponent: 2,
      setsAlan: 1,
      setsOpponent: 4,
      decidersAlan: 0,
      decidersOpponent: 1,
    });
    expect(stats.surfaceSplit.hard).toEqual({
      played: 1,
      alan: 1,
      opponent: 0,
      setsAlan: 2,
      setsOpponent: 1,
      decidersAlan: 1,
      decidersOpponent: 0,
    });
    expect(stats.surfaceSplit.clay).toEqual({
      played: 4,
      alan: 3,
      opponent: 1,
      setsAlan: 7,
      setsOpponent: 3,
      decidersAlan: 1,
      decidersOpponent: 1,
    });
    expect(stats.surfaceSplit.grass).toEqual({
      played: 0,
      alan: 0,
      opponent: 0,
      setsAlan: 0,
      setsOpponent: 0,
      decidersAlan: 0,
      decidersOpponent: 0,
    });
  });

  it("computes the current streak within each surface", () => {
    expect(stats.surfaceStreak.astro).toEqual({ winner: "opponent", count: 2 });
    expect(stats.surfaceStreak.hard).toEqual({ winner: "alan", count: 1 });
    expect(stats.surfaceStreak.clay).toEqual({ winner: "alan", count: 1 });
    expect(stats.surfaceStreak.grass).toEqual({ winner: null, count: 0 });
  });

  it("returns recent form newest-first, capped at five", () => {
    expect(stats.recentForm.map((f) => f.winner)).toEqual(["alan", "opponent", "alan", "alan", "alan"]);
  });

  it("groups results into newest-first streak runs", () => {
    expect(stats.streakHistory).toEqual([
      { winner: "alan", count: 1 },
      { winner: "opponent", count: 1 },
      { winner: "alan", count: 3 },
      { winner: "opponent", count: 2 },
    ]);
  });
});

describe("deriveMatchContext", () => {
  it("captures the head-to-head before and after a match", () => {
    const ctx = deriveMatchContext(bishop, "s-6");
    expect(ctx.matchNumber).toBe(6);
    expect(ctx.totalMatches).toBe(7);
    expect(ctx.winner).toBe("opponent");
    expect(ctx.recordBefore).toEqual({ alan: 3, opponent: 2 });
    expect(ctx.recordAfter).toEqual({ alan: 3, opponent: 3 });
  });

  it("detects when a match snapped the other player's streak", () => {
    const ctx = deriveMatchContext(bishop, "s-6");
    expect(ctx.snappedStreak).toEqual({ player: "alan", count: 3 });
    expect(ctx.streakAfter).toEqual({ winner: "opponent", count: 1 });
  });

  it("reports the running streak it extended", () => {
    const ctx = deriveMatchContext(bishop, "s-5");
    expect(ctx.streakAfter).toEqual({ winner: "alan", count: 3 });
    expect(ctx.snappedStreak).toBeNull();
  });

  it("throws on an unknown match id", () => {
    expect(() => deriveMatchContext(bishop, "nope")).toThrow();
  });
});

describe("deriveOverviewStats (empty)", () => {
  it("handles no matches", () => {
    const stats = deriveOverviewStats([]);
    expect(stats.totalMatches).toBe(0);
    expect(stats.currentStreak).toEqual({ winner: null, count: 0 });
    expect(stats.matchRecord).toEqual({ alan: 0, opponent: 0 });
    expect(stats.streakHistory).toEqual([]);
  });
});

// An in-progress match: full set detail, 1–1, no winner yet.
const unfinished = (seq: number, surface: Match["surface"]): DetailedMatch => ({
  id: `u-${seq}`,
  seq,
  surface,
  fidelity: "sets",
  status: "unfinished",
  sets: [
    { alan: 6, opponent: 4 },
    { alan: 3, opponent: 6 },
  ],
});

describe("unfinished matches", () => {
  it("deriveMatchResult reports no winner and never a decider", () => {
    const result = deriveMatchResult(unfinished(1, "clay"));
    expect(result.winner).toBeNull();
    expect(result.isUnfinished).toBe(true);
    expect(result.isDecider).toBe(false);
    // The running tally is still meaningful for display.
    expect(result.matchScore).toEqual({ alan: 1, opponent: 1 });
    expect(result.setScores).toEqual(["6-4", "3-6"]);
  });

  it("isUnfinished flags only status:unfinished matches", () => {
    expect(isUnfinished(unfinished(1, "clay"))).toBe(true);
    expect(isUnfinished(score(1, "clay", 2, 0))).toBe(false);
  });

  it("formatNeutralScoreline reads Alan-left / Andy-right", () => {
    expect(formatNeutralScoreline(unfinished(1, "clay"))).toEqual({
      alan: 1,
      opponent: 1,
      setScores: ["6-4", "3-6"],
    });
  });

  it("formatWinnerScoreline refuses an unfinished match", () => {
    expect(() => formatWinnerScoreline(unfinished(1, "clay"))).toThrow();
  });

  it("deriveMatchContext refuses an unfinished match", () => {
    const matches: Match[] = [score(1, "clay", 2, 0), unfinished(2, "clay")];
    expect(() => deriveMatchContext(matches, "u-2")).toThrow();
  });

  it("is excluded from every record, streak and the played total", () => {
    // One finished match (Alan 2–0) plus one unfinished — only the finished one counts.
    const stats = deriveOverviewStats([score(1, "clay", 2, 0), unfinished(2, "clay")]);
    expect(stats.totalMatches).toBe(1);
    expect(stats.matchRecord).toEqual({ alan: 1, opponent: 0 });
    expect(stats.setRecord).toEqual({ alan: 2, opponent: 0 });
    expect(stats.currentStreak).toEqual({ winner: "alan", count: 1 });
    expect(stats.recentForm).toEqual([{ matchId: "s-1", winner: "alan" }]);
    expect(stats.surfaceSplit.clay.played).toBe(1);
  });
});
