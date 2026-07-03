import { describe, expect, it } from "vitest";
import { appendMatch, serializeDataset } from "./addMatch";
import { DeucelineDataset } from "./schema";
import { DatasetValidationError, validateDataset } from "./validateDataset";

const baseDataset = (): DeucelineDataset => ({
  schemaVersion: 2,
  rivalry: {
    id: "alan-vs-andy",
    title: "Alan vs Andy",
    players: {
      alan: { displayName: "Alan", color: "#57298a", abbr: "Al" },
      opponent: { displayName: "Andy", color: "#1e7a45", abbr: "An" },
    },
  },
  matches: [
    {
      id: "match-1",
      seq: 1,
      surface: "clay",
      location: "Bishop",
      fidelity: "matchScore",
      matchScore: { alan: 2, opponent: 0 },
    },
  ],
});

describe("appendMatch", () => {
  it("appends with the next seq, a matching id, and leaves the original untouched", () => {
    const dataset = baseDataset();
    const next = appendMatch(dataset, {
      surface: "grass",
      fidelity: "matchScore",
      matchScore: { alan: 0, opponent: 2 },
    });

    expect(next.matches).toHaveLength(2);
    expect(next.matches[1]).toMatchObject({ id: "match-2", seq: 2, surface: "grass" });
    expect(dataset.matches).toHaveLength(1);
  });

  it("omits empty optional fields and trims the kept ones", () => {
    const next = appendMatch(baseDataset(), {
      date: "",
      surface: "hard",
      location: "  Bishop  ",
      notes: "   ",
      fidelity: "matchScore",
      matchScore: { alan: 2, opponent: 1 },
    });

    const added = next.matches[1];
    expect(added).not.toHaveProperty("date");
    expect(added).not.toHaveProperty("notes");
    expect(added.location).toBe("Bishop");
  });

  it("skips over an already-taken id", () => {
    const dataset = baseDataset();
    dataset.matches[0].id = "match-2";

    const next = appendMatch(dataset, {
      surface: "clay",
      fidelity: "matchScore",
      matchScore: { alan: 2, opponent: 0 },
    });

    expect(next.matches[1].seq).toBe(2);
    expect(next.matches[1].id).toBe("match-3");
  });

  it("produces a dataset that passes validation for good input", () => {
    const next = appendMatch(baseDataset(), {
      date: "2026-07-03",
      surface: "clay",
      location: "Bishop",
      fidelity: "sets",
      sets: [
        { alan: 6, opponent: 3 },
        { alan: 7, opponent: 6, tiebreak: { alan: 7, opponent: 4 } },
      ],
    });

    expect(() => validateDataset(next)).not.toThrow();
  });

  it("leaves bad input for the validator to reject loudly", () => {
    const next = appendMatch(baseDataset(), {
      surface: "clay",
      fidelity: "matchScore",
      matchScore: { alan: 1, opponent: 1 },
    });

    expect(() => validateDataset(next)).toThrow(DatasetValidationError);
  });
});

describe("serializeDataset", () => {
  it("round-trips through the validator and ends with a newline", () => {
    const text = serializeDataset(baseDataset());
    expect(text.endsWith("}\n")).toBe(true);
    expect(() => validateDataset(JSON.parse(text))).not.toThrow();
  });
});
