import { describe, expect, it } from "vitest";
import { DatasetValidationError, validateDataset } from "./validateDataset";

const validDataset = () => ({
  schemaVersion: 2,
  rivalry: {
    id: "alan-vs-andy",
    title: "Alan vs Andy",
    players: {
      alan: { displayName: "Alan", color: "#b85c3d", abbr: "Al" },
      opponent: { displayName: "Andy", color: "#2d7c46", abbr: "An" },
    },
  },
  matches: [
    { id: "match-1", seq: 1, surface: "astro", location: "Bishop", fidelity: "matchScore", matchScore: { alan: 1, opponent: 2 } },
    {
      id: "match-2",
      seq: 2,
      date: "2026-06-28",
      surface: "clay",
      fidelity: "sets",
      sets: [
        { alan: 6, opponent: 3 },
        { alan: 3, opponent: 6 },
        { alan: 7, opponent: 5 },
      ],
    },
  ],
});

function expectIssues(value: unknown): string[] {
  try {
    validateDataset(value);
  } catch (error) {
    if (error instanceof DatasetValidationError) return error.issues;
    throw error;
  }
  throw new Error("Expected validateDataset to throw.");
}

describe("validateDataset", () => {
  it("accepts a well-formed dataset", () => {
    expect(() => validateDataset(validDataset())).not.toThrow();
  });

  it("rejects the wrong schema version", () => {
    const data = validDataset();
    data.schemaVersion = 1 as never;
    expect(expectIssues(data)).toContain("schemaVersion must be 2.");
  });

  it("requires a positive integer seq", () => {
    const data = validDataset();
    data.matches[0].seq = 0;
    expect(expectIssues(data).some((i) => i.includes("seq must be a positive integer"))).toBe(true);
  });

  it("rejects duplicate seq values", () => {
    const data = validDataset();
    data.matches[1].seq = 1;
    expect(expectIssues(data)).toContain("Duplicate match seq: 1.");
  });

  it("rejects duplicate ids", () => {
    const data = validDataset();
    data.matches[1].id = "match-1";
    expect(expectIssues(data)).toContain("Duplicate match id: match-1.");
  });

  it("allows a missing date but rejects an invalid one", () => {
    const ok = validDataset();
    delete (ok.matches[0] as { date?: string }).date;
    expect(() => validateDataset(ok)).not.toThrow();

    const bad = validDataset();
    (bad.matches[0] as { date?: string }).date = "2026-02-30";
    expect(expectIssues(bad).some((i) => i.includes("date must be YYYY-MM-DD"))).toBe(true);
  });

  it("accepts optional weather: condition tags and a temperature", () => {
    const data = validDataset();
    (data.matches[0] as Record<string, unknown>).conditions = ["sunny", "windy"];
    (data.matches[0] as Record<string, unknown>).tempC = 24;
    expect(() => validateDataset(data)).not.toThrow();
  });

  it("rejects an unknown weather tag", () => {
    const data = validDataset();
    (data.matches[0] as Record<string, unknown>).conditions = ["sunny", "snowing"];
    expect(expectIssues(data).some((i) => i.includes("unknown weather tag: snowing"))).toBe(true);
  });

  it("rejects a duplicate weather tag", () => {
    const data = validDataset();
    (data.matches[0] as Record<string, unknown>).conditions = ["hot", "hot"];
    expect(expectIssues(data).some((i) => i.includes("duplicate weather tag: hot"))).toBe(true);
  });

  it("rejects conditions that aren't an array", () => {
    const data = validDataset();
    (data.matches[0] as Record<string, unknown>).conditions = "sunny";
    expect(expectIssues(data).some((i) => i.includes("conditions must be an array"))).toBe(true);
  });

  it("rejects an out-of-range or non-numeric temperature", () => {
    const hot = validDataset();
    (hot.matches[0] as Record<string, unknown>).tempC = 120;
    expect(expectIssues(hot).some((i) => i.includes("tempC must be a number between -30 and 55"))).toBe(true);

    const nan = validDataset();
    (nan.matches[0] as Record<string, unknown>).tempC = Number.NaN;
    expect(expectIssues(nan).some((i) => i.includes("tempC must be a number"))).toBe(true);
  });

  it("rejects an unknown fidelity", () => {
    const data = validDataset();
    (data.matches[0] as { fidelity: string }).fidelity = "winner";
    expect(expectIssues(data).some((i) => i.includes('fidelity must be "sets" or "matchScore"'))).toBe(true);
  });

  it("rejects unknown fields instead of silently ignoring derived data", () => {
    const data = validDataset();
    (data.matches[0] as Record<string, unknown>).winner = "opponent";
    expect(expectIssues(data)).toContain("match match-1 has unknown field: winner.");
  });

  it("rejects score fields from the wrong fidelity level", () => {
    const scoreOnly = validDataset();
    (scoreOnly.matches[0] as Record<string, unknown>).sets = [{ alan: 6, opponent: 3 }];
    expect(expectIssues(scoreOnly)).toContain("match match-1 has unknown field: sets.");

    const detailed = validDataset();
    (detailed.matches[1] as Record<string, unknown>).matchScore = { alan: 2, opponent: 1 };
    expect(expectIssues(detailed)).toContain("match match-2 has unknown field: matchScore.");
  });

  it("requires a hex player color and an abbreviation", () => {
    const noColor = validDataset();
    delete (noColor.rivalry.players.alan as { color?: string }).color;
    expect(expectIssues(noColor).some((i) => i.includes("color must be a hex color"))).toBe(true);

    const badColor = validDataset();
    (badColor.rivalry.players.alan as { color: string }).color = "terracotta";
    expect(expectIssues(badColor).some((i) => i.includes("color must be a hex color"))).toBe(true);

    const noAbbr = validDataset();
    delete (noAbbr.rivalry.players.opponent as { abbr?: string }).abbr;
    expect(expectIssues(noAbbr)).toContain("rivalry.players.opponent.abbr is required.");
  });

  it("rejects unknown nested fields", () => {
    const playerData = validDataset();
    (playerData.rivalry.players.alan as Record<string, unknown>).seed = 1;
    expect(expectIssues(playerData)).toContain("rivalry.players.alan has unknown field: seed.");

    const scoreData = validDataset();
    ((scoreData.matches[0] as { matchScore: Record<string, unknown> }).matchScore).winner = "opponent";
    expect(expectIssues(scoreData)).toContain("match match-1 matchScore has unknown field: winner.");
  });

  it("rejects a tied match score", () => {
    const data = validDataset();
    (data.matches[0] as { matchScore: { alan: number; opponent: number } }).matchScore = { alan: 1, opponent: 1 };
    expect(expectIssues(data).some((i) => i.includes("matchScore cannot be tied"))).toBe(true);
  });

  it("rejects an empty match score", () => {
    const data = validDataset();
    (data.matches[0] as { matchScore: { alan: number; opponent: number } }).matchScore = { alan: 0, opponent: 0 };
    expect(expectIssues(data).some((i) => i.includes("must record at least one set"))).toBe(true);
  });

  it("rejects a tied set", () => {
    const data = validDataset();
    (data.matches[1] as { sets: Array<{ alan: number; opponent: number }> }).sets = [{ alan: 6, opponent: 6 }];
    expect(expectIssues(data).some((i) => i.includes("cannot include a tied set"))).toBe(true);
  });

  it("rejects a match that ends level on sets", () => {
    const data = validDataset();
    (data.matches[1] as { sets: Array<{ alan: number; opponent: number }> }).sets = [
      { alan: 6, opponent: 3 },
      { alan: 3, opponent: 6 },
    ];
    expect(expectIssues(data).some((i) => i.includes("cannot end with a tied match score"))).toBe(true);
  });
});

describe("validateDataset — unfinished matches", () => {
  it("accepts a 1–1 unfinished match (a tied match score is allowed while suspended)", () => {
    const data = validDataset();
    const match = data.matches[1] as Record<string, unknown>;
    match.status = "unfinished";
    (match as { sets: Array<{ alan: number; opponent: number }> }).sets = [
      { alan: 6, opponent: 4 },
      { alan: 3, opponent: 6 },
    ];
    expect(() => validateDataset(data)).not.toThrow();
  });

  it("accepts a tied matchScore tally only when unfinished", () => {
    const data = validDataset();
    const match = data.matches[0] as Record<string, unknown>;
    match.status = "unfinished";
    (match as { matchScore: { alan: number; opponent: number } }).matchScore = { alan: 1, opponent: 1 };
    expect(() => validateDataset(data)).not.toThrow();
  });

  it("still rejects a tied individual set even when unfinished", () => {
    const data = validDataset();
    const match = data.matches[1] as Record<string, unknown>;
    match.status = "unfinished";
    (match as { sets: Array<{ alan: number; opponent: number }> }).sets = [{ alan: 6, opponent: 6 }];
    expect(expectIssues(data).some((i) => i.includes("cannot include a tied set"))).toBe(true);
  });

  it("rejects a status value other than \"unfinished\"", () => {
    const data = validDataset();
    (data.matches[0] as Record<string, unknown>).status = "retired";
    expect(expectIssues(data).some((i) => i.includes('status must be "unfinished"'))).toBe(true);
  });
});
