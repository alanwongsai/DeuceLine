import { describe, expect, it } from "vitest";
import { describeFormIssue } from "./formIssues";
import { appendMatch } from "./addMatch";
import { DeucelineDataset } from "./schema";
import { DatasetValidationError, validateDataset } from "./validateDataset";

const dataset: DeucelineDataset = {
  schemaVersion: 2,
  rivalry: {
    id: "r",
    title: "Alan vs Andy",
    players: {
      alan: { displayName: "Alan", color: "#6b3fa0", abbr: "AL" },
      opponent: { displayName: "Andy", color: "#2d7c46", abbr: "AN" },
    },
  },
  matches: [],
};

// Run a draft through the real validator, the way the form does.
function formIssues(input: Parameters<typeof appendMatch>[1]): string[] {
  try {
    validateDataset(appendMatch(dataset, input));
    return [];
  } catch (reason) {
    if (!(reason instanceof DatasetValidationError)) throw reason;
    return reason.issues.map(describeFormIssue);
  }
}

describe("describeFormIssue", () => {
  it("asks for the decider at one set all instead of quoting the dataset path", () => {
    expect(formIssues({ surface: "hard", fidelity: "sets", sets: [{ alan: 6, opponent: 4 }, { alan: 3, opponent: 6 }] })).toEqual([
      "It's one set all — enter the match tiebreak (or third set), or mark the match Unfinished.",
    ]);
  });

  it("numbers sets from one and keeps the rule text", () => {
    expect(formIssues({ surface: "hard", fidelity: "sets", sets: [{ alan: 6, opponent: 5 }, { alan: 6, opponent: 2 }] })).toEqual([
      "Set 1: 6-5 isn't a valid set score (6-0 to 6-4, 7-5 or 7-6).",
    ]);
  });

  it("rewords match tiebreak problems", () => {
    expect(
      formIssues({
        surface: "hard",
        fidelity: "sets",
        sets: [{ alan: 6, opponent: 4 }, { alan: 3, opponent: 6 }],
        matchTiebreak: { alan: 10, opponent: 9 },
      }),
    ).toEqual(["Match tiebreak must be won by two clear points."]);
  });

  it("falls back to the bare message, capitalised", () => {
    expect(describeFormIssue("match match-3 has unknown field: foo.")).toBe("Has unknown field: foo.");
  });
});
