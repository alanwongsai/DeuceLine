import { describe, expect, it } from "vitest";
import { DatasetValidationError, validateDataset } from "./validateDataset";

const validDataset = () => ({
  schemaVersion: 2,
  rivalry: {
    id: "alan-vs-andy",
    title: "Alan vs Andy",
    players: {
      alan: { displayName: "Alan" },
      opponent: { displayName: "Andy" },
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

  it("rejects an unknown fidelity", () => {
    const data = validDataset();
    (data.matches[0] as { fidelity: string }).fidelity = "winner";
    expect(expectIssues(data).some((i) => i.includes('fidelity must be "sets" or "matchScore"'))).toBe(true);
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
