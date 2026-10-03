import { describe, expect, it } from "vitest";
import { deriveNextMatchLean, deriveRivalryNote } from "./narrative";
import { DetailedMatch, Match, ScoreMatch } from "./schema";

const names = { alan: "Alan", opponent: "Andy" };

const score = (seq: number, alan: number, opponent: number, surface: Match["surface"] = "hard"): ScoreMatch => ({
  id: `s-${seq}`,
  seq,
  surface,
  fidelity: "matchScore",
  matchScore: { alan, opponent },
});

const sets = (seq: number, played: DetailedMatch["sets"], extra: Partial<DetailedMatch> = {}): DetailedMatch => ({
  id: `d-${seq}`,
  seq,
  surface: "hard",
  fidelity: "sets",
  sets: played,
  ...extra,
});

const alanWin = (seq: number) => score(seq, 2, 0);
const andyWin = (seq: number) => score(seq, 0, 2);

describe("deriveRivalryNote", () => {
  it("is empty until a match is finished", () => {
    expect(deriveRivalryNote([], names)).toEqual([]);
    expect(deriveRivalryNote([{ ...andyWin(1), status: "unfinished", matchScore: { alan: 1, opponent: 1 } }], names)).toEqual([]);
  });

  it("credits a run to its owner even when the other player leads", () => {
    // Alan 3–0, then Andy wins a super tiebreak from a set down, twice running.
    const matches: Match[] = [
      alanWin(1),
      alanWin(2),
      alanWin(3),
      andyWin(4),
      sets(5, [{ alan: 6, opponent: 4 }, { alan: 3, opponent: 6 }], { matchTiebreak: { alan: 8, opponent: 10 } }),
    ];
    const [headline, standing] = deriveRivalryNote(matches, names);
    expect(headline).toBe("Andy wins the super tiebreak 10–8 on Hard, from a set down.");
    expect(standing).toBe("Two in a row for Andy — Alan still leads 3–2.");
  });

  it("names the lead change, the extension and a level score", () => {
    expect(deriveRivalryNote([andyWin(1), alanWin(2), alanWin(3)], names)[1]).toBe("Two in a row for Alan — now ahead 2–1.");
    expect(deriveRivalryNote([alanWin(1), andyWin(2), alanWin(3)], names)[1]).toBe("Alan moves ahead 2–1.");
    expect(deriveRivalryNote([alanWin(1), alanWin(2), andyWin(3), alanWin(4)], names)[1]).toBe("Alan extends the lead to 3–1.");
    expect(deriveRivalryNote([alanWin(1), andyWin(2)], names)[1]).toBe("Level at 1–1.");
  });

  it("describes how the latest match was won", () => {
    const comeback = sets(1, [{ alan: 2, opponent: 6 }, { alan: 6, opponent: 3 }, { alan: 7, opponent: 5 }]);
    const thirdSet = sets(1, [{ alan: 6, opponent: 2 }, { alan: 3, opponent: 6 }, { alan: 7, opponent: 5 }]);
    expect(deriveRivalryNote([comeback], names)[0]).toBe("Alan comes back from a set down on Hard.");
    expect(deriveRivalryNote([thirdSet], names)[0]).toBe("Alan wins a third-set decider on Hard.");
    expect(deriveRivalryNote([score(1, 0, 2, "clay")], names)[0]).toBe("Andy wins in straight sets on Clay.");
    expect(deriveRivalryNote([score(1, 1, 2, "astro")], names)[0]).toBe("Andy wins a deciding set on Astro.");
  });

  it("ends with the next-match lean", () => {
    expect(deriveRivalryNote([alanWin(1), andyWin(2)], names)[2]).toBe("Next match: a toss-up.");
    expect(deriveRivalryNote([alanWin(1), alanWin(2), alanWin(3)], names)[2]).toBe("Next match: Alan favoured.");
  });
});

describe("deriveNextMatchLean", () => {
  it("returns null with no finished match", () => {
    expect(deriveNextMatchLean([])).toBeNull();
  });

  it("weighs head-to-head, form and the latest court, and skips thin samples", () => {
    // Alan leads 4–3 overall, Andy has 3 of the last 5, hard is 2–2.
    const matches: Match[] = [
      alanWin(1),
      alanWin(2),
      { ...alanWin(3), surface: "clay" },
      { ...andyWin(4), surface: "clay" },
      andyWin(5),
      alanWin(6),
      andyWin(7),
    ];
    const lean = deriveNextMatchLean(matches)!;
    expect(lean.surface).toBe("hard");
    const byKey = Object.fromEntries(lean.factors.map((factor) => [factor.key, factor]));
    expect(byKey.headToHead).toMatchObject({ record: { alan: 4, opponent: 3 }, favours: "alan", counted: true });
    expect(byKey.recentForm).toMatchObject({ record: { alan: 2, opponent: 3 }, favours: "opponent", counted: true });
    expect(byKey.surface).toMatchObject({ record: { alan: 3, opponent: 2 }, favours: "alan", counted: true });
    expect(byKey.superTiebreaks).toMatchObject({ record: { alan: 0, opponent: 0 }, favours: null, counted: false });
    // 0.3·(1/7) − 0.35·(1/5) + 0.25·(1/5) ≈ 0.023 → a toss-up.
    expect(lean.balance).toBeCloseTo(0.3 / 7 - 0.07 + 0.05, 6);
    expect(lean.verdict).toBe("tossUp");
    expect(lean.favourite).toBeNull();
  });

  it("does not weigh a single super tiebreak", () => {
    const matches: Match[] = [
      sets(1, [{ alan: 6, opponent: 4 }, { alan: 3, opponent: 6 }], { matchTiebreak: { alan: 10, opponent: 6 } }),
    ];
    const superTiebreaks = deriveNextMatchLean(matches)!.factors.find((factor) => factor.key === "superTiebreaks")!;
    expect(superTiebreaks).toMatchObject({ record: { alan: 1, opponent: 0 }, counted: false, favours: null });
  });
});
