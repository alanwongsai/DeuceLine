import { describe, expect, it } from "vitest";
import { appendMatch, replaceMatch, serializeDataset } from "./addMatch";
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

describe("appendMatch — status", () => {
  it("emits status when unfinished and omits it otherwise", () => {
    const unfinished = appendMatch(baseDataset(), {
      surface: "clay",
      status: "unfinished",
      fidelity: "sets",
      sets: [
        { alan: 6, opponent: 4 },
        { alan: 3, opponent: 6 },
      ],
    });
    expect(unfinished.matches[1]).toMatchObject({ status: "unfinished" });
    expect(() => validateDataset(unfinished)).not.toThrow();

    const finished = appendMatch(baseDataset(), {
      surface: "clay",
      fidelity: "matchScore",
      matchScore: { alan: 2, opponent: 0 },
    });
    expect(finished.matches[1]).not.toHaveProperty("status");
  });
});

describe("appendMatch — weather", () => {
  it("stores condition tags and temperature, and validates", () => {
    const next = appendMatch(baseDataset(), {
      surface: "hard",
      conditions: ["sunny", "windy"],
      tempC: 24,
      fidelity: "matchScore",
      matchScore: { alan: 2, opponent: 0 },
    });
    expect(next.matches[1]).toMatchObject({ conditions: ["sunny", "windy"], tempC: 24 });
    expect(() => validateDataset(next)).not.toThrow();
  });

  it("omits an empty conditions list and an undefined temperature", () => {
    const next = appendMatch(baseDataset(), {
      surface: "hard",
      conditions: [],
      fidelity: "matchScore",
      matchScore: { alan: 2, opponent: 0 },
    });
    expect(next.matches[1]).not.toHaveProperty("conditions");
    expect(next.matches[1]).not.toHaveProperty("tempC");
  });

  it("passes a mistyped (NaN) temperature through for the validator to reject", () => {
    const next = appendMatch(baseDataset(), {
      surface: "hard",
      tempC: Number.NaN,
      fidelity: "matchScore",
      matchScore: { alan: 2, opponent: 0 },
    });
    expect(next.matches[1]).toHaveProperty("tempC");
    expect(() => validateDataset(next)).toThrow(DatasetValidationError);
  });
});

describe("replaceMatch", () => {
  const withUnfinished = (): DeucelineDataset => {
    const dataset = baseDataset();
    dataset.matches.push({
      id: "match-2",
      seq: 2,
      surface: "clay",
      status: "unfinished",
      fidelity: "sets",
      sets: [
        { alan: 6, opponent: 4 },
        { alan: 3, opponent: 6 },
      ],
    });
    return dataset;
  };

  it("swaps the body while preserving the original id and seq", () => {
    const dataset = withUnfinished();
    const next = replaceMatch(dataset, "match-2", {
      date: "2026-07-05",
      surface: "grass",
      fidelity: "sets",
      sets: [
        { alan: 6, opponent: 4 },
        { alan: 3, opponent: 6 },
        { alan: 6, opponent: 2 },
      ],
    });

    const updated = next.matches[1];
    expect(updated).toMatchObject({ id: "match-2", seq: 2, surface: "grass" });
    // Completing it drops the unfinished status, and it now validates as decided.
    expect(updated).not.toHaveProperty("status");
    expect(() => validateDataset(next)).not.toThrow();
    // Original is untouched (immutability).
    expect(dataset.matches[1]).toMatchObject({ status: "unfinished" });
  });

  it("throws on an unknown id", () => {
    expect(() => replaceMatch(baseDataset(), "match-99", { surface: "clay", fidelity: "matchScore", matchScore: { alan: 2, opponent: 0 } })).toThrow();
  });
});

describe("serializeDataset", () => {
  it("round-trips through the validator and ends with a newline", () => {
    const text = serializeDataset(baseDataset());
    expect(text.endsWith("}\n")).toBe(true);
    expect(() => validateDataset(JSON.parse(text))).not.toThrow();
  });
});
