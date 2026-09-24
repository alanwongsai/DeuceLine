import { describe, expect, it } from "vitest";
import { DeucelineDataset } from "../../src/domain/schema";
import { checkPublishKey, DatasetStore, handleAddMatch, handleGetDataset, handleUpdateMatch, PublishError } from "./_publish";

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
    { id: "match-1", seq: 1, surface: "clay", fidelity: "matchScore", matchScore: { alan: 2, opponent: 0 } },
    {
      id: "match-2",
      seq: 2,
      surface: "hard",
      status: "unfinished",
      fidelity: "matchScore",
      matchScore: { alan: 1, opponent: 1 },
    },
  ],
});

// In-memory stand-in for the GitHub store: records writes, can simulate a
// stale-sha conflict or an unexpected failure.
function memoryStore(options: { conflict?: boolean; explode?: boolean } = {}) {
  const writes: { serialized: string; message: string; version: string }[] = [];
  const store: DatasetStore = {
    async read() {
      if (options.explode) throw new Error("network down");
      return { current: baseDataset(), version: "sha-1" };
    },
    async write(serialized, message, version) {
      if (options.conflict) throw new PublishError(409, "The data changed since you loaded it — reload and try again.");
      writes.push({ serialized, message, version });
    },
  };
  return { store, writes };
}

const newMatch = { date: "2026-09-20", surface: "grass", fidelity: "matchScore", matchScore: { alan: 0, opponent: 2 } };

describe("checkPublishKey", () => {
  const config = { GITHUB_TOKEN: "token", ADD_MATCH_PASSWORD: "secret" };

  it("refuses when the publisher is not configured", () => {
    expect(checkPublishKey({ ADD_MATCH_PASSWORD: "secret" }, "secret")?.status).toBe(500);
    expect(checkPublishKey({ GITHUB_TOKEN: "token" }, "secret")?.status).toBe(500);
  });

  it("rejects a wrong or missing password and admits the right one", () => {
    expect(checkPublishKey(config, "nope")?.status).toBe(401);
    expect(checkPublishKey(config, null)?.status).toBe(401);
    expect(checkPublishKey(config, "secret")).toBeNull();
  });
});

describe("handleGetDataset", () => {
  it("returns the stored dataset", async () => {
    const { store } = memoryStore();
    const result = await handleGetDataset(store);
    expect(result.status).toBe(200);
    expect(result.body.dataset).toEqual(baseDataset());
  });

  it("turns an unexpected store failure into a 502", async () => {
    const { store } = memoryStore({ explode: true });
    expect((await handleGetDataset(store)).status).toBe(502);
  });
});

describe("handleAddMatch", () => {
  it("appends, commits once on the read version, and returns the next dataset", async () => {
    const { store, writes } = memoryStore();
    const result = await handleAddMatch(store, { match: newMatch });

    expect(result.status).toBe(200);
    expect(result.body.seq).toBe(3);
    expect(writes).toHaveLength(1);
    expect(writes[0].message).toBe("Add match 3: grass on 2026-09-20");
    expect(writes[0].version).toBe("sha-1");
    const committed = JSON.parse(writes[0].serialized) as DeucelineDataset;
    expect(committed.matches).toHaveLength(3);
    expect(committed.matches.slice(0, 2)).toEqual(baseDataset().matches);
  });

  it("rejects a malformed body without touching the store", async () => {
    const { store, writes } = memoryStore();
    expect((await handleAddMatch(store, null)).status).toBe(400);
    expect((await handleAddMatch(store, { dataset: baseDataset() })).status).toBe(400);
    expect(writes).toHaveLength(0);
  });

  it("rejects an invalid match with the validator's issues and writes nothing", async () => {
    const { store, writes } = memoryStore();
    const result = await handleAddMatch(store, { match: { ...newMatch, matchScore: { alan: 1, opponent: 1 } } });
    expect(result.status).toBe(422);
    expect(result.body.issues).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(writes).toHaveLength(0);
  });

  it("surfaces a stale-version conflict as 409", async () => {
    const { store } = memoryStore({ conflict: true });
    const result = await handleAddMatch(store, { match: newMatch });
    expect(result).toEqual({ status: 409, body: { error: "The data changed since you loaded it — reload and try again." } });
  });

  it("turns an unexpected failure into a 502", async () => {
    const { store } = memoryStore({ explode: true });
    expect(await handleAddMatch(store, { match: newMatch })).toEqual({ status: 502, body: { error: "Unexpected publish failure." } });
  });
});

describe("handleUpdateMatch", () => {
  const completed = { surface: "hard", fidelity: "matchScore", matchScore: { alan: 2, opponent: 1 } };

  it("completes an unfinished match in place, keeping its id and seq", async () => {
    const { store, writes } = memoryStore();
    const result = await handleUpdateMatch(store, { id: "match-2", match: completed });

    expect(result.status).toBe(200);
    expect(result.body.seq).toBe(2);
    expect(writes[0].message).toBe("Update match 2: hard");
    const committed = JSON.parse(writes[0].serialized) as DeucelineDataset;
    expect(committed.matches[1]).toMatchObject({ id: "match-2", seq: 2, matchScore: { alan: 2, opponent: 1 } });
    expect(committed.matches[1]).not.toHaveProperty("status");
  });

  it("refuses to touch a finished match", async () => {
    const { store, writes } = memoryStore();
    const result = await handleUpdateMatch(store, { id: "match-1", match: completed });
    expect(result.status).toBe(422);
    expect(writes).toHaveLength(0);
  });

  it("reports an unknown id as 404 and a malformed body as 400", async () => {
    const { store } = memoryStore();
    expect((await handleUpdateMatch(store, { id: "match-9", match: completed })).status).toBe(404);
    expect((await handleUpdateMatch(store, { match: completed })).status).toBe(400);
  });
});
