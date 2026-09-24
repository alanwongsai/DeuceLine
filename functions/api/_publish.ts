// Platform-neutral publish core for the write endpoints. Files whose name starts
// with "_" are not routed by Cloudflare Pages, so this is a plain module.
//
// Two hosts run it: the Cloudflare Pages Functions behind the web app, and the
// WeChat CloudBase cloud functions behind the mini program (see MINIPROGRAM.md,
// which requires it through the `npm run build:core` bundle). Each host adapter
// only parses its own request shape and maps the PublishResult back onto its own
// response. The gate (shared password), the write rules (append-only add; update
// only while the STORED match is unfinished) and server-side re-validation live
// here once, so the two hosts cannot drift on them.

import { appendMatch, NewMatchInput, replaceMatch, serializeDataset } from "../../src/domain/addMatch";
import { isUnfinished } from "../../src/domain/deriveStats";
import { DeucelineDataset } from "../../src/domain/schema";
import { DatasetValidationError, validateDataset } from "../../src/domain/validateDataset";

// A store failure that already knows how it should surface to the client
// (status + user-facing message). Handlers turn it into a result directly.
export class PublishError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "PublishError";
  }
}

// Where the canonical dataset lives (the repo JSON via the GitHub API — see
// _github.ts). `version` is an opaque optimistic-concurrency token (the blob
// sha): write() must throw PublishError(409) when the stored dataset changed
// since that read.
export interface DatasetStore {
  read(): Promise<{ current: DeucelineDataset; version: string }>;
  write(serialized: string, message: string, version: string): Promise<void>;
}

// A host-agnostic HTTP-style reply; adapters map it onto their own response type.
export type PublishResult = { status: number; body: Record<string, unknown> };

// Both hosts are configured with the same two secrets under the same names.
export type PublishConfig = { GITHUB_TOKEN?: string; ADD_MATCH_PASSWORD?: string };

const reply = (status: number, body: Record<string, unknown>): PublishResult => ({ status, body });

// Reject early on a length mismatch, then compare without short-circuiting so the
// password check doesn't leak character positions through timing.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// The write gate shared by every host: the publisher must be configured, and the
// caller must present the shared password. Returns a rejection, or null when the
// caller may proceed.
export function checkPublishKey(config: PublishConfig, provided: string | null | undefined): PublishResult | null {
  if (!config.GITHUB_TOKEN || !config.ADD_MATCH_PASSWORD) {
    return reply(500, { error: "Publisher is not configured." });
  }
  if (!constantTimeEqual(provided ?? "", config.ADD_MATCH_PASSWORD)) {
    return reply(401, { error: "Wrong password." });
  }
  return null;
}

function toFailure(reason: unknown): PublishResult {
  if (reason instanceof PublishError) {
    return reply(reason.status, { error: reason.message, ...(reason.detail ? { detail: reason.detail } : {}) });
  }
  return reply(502, { error: "Unexpected publish failure." });
}

function rejected(reason: unknown): PublishResult {
  const issues = reason instanceof DatasetValidationError ? reason.issues : ["Invalid match."];
  return reply(422, { error: "Match rejected.", issues });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Read path for clients that cannot fetch the static JSON themselves (the mini
// program reads through a cloud function). Same validation as every other read.
export async function handleGetDataset(store: DatasetStore): Promise<PublishResult> {
  try {
    const { current } = await store.read();
    return reply(200, { ok: true, dataset: current });
  } catch (reason) {
    return toFailure(reason);
  }
}

// Append-only add. The body carries ONLY a new match; the current dataset is
// re-read and re-validated here, so this can add one match but never delete or
// rewrite existing ones, whatever the caller sends.
export async function handleAddMatch(store: DatasetStore, body: unknown): Promise<PublishResult> {
  if (!isObject(body) || !body.match) {
    return reply(400, { error: "Expected a JSON body like { match: … }." });
  }
  const input = body.match as NewMatchInput;

  try {
    const { current, version } = await store.read();

    let next;
    try {
      next = validateDataset(appendMatch(current, input));
    } catch (reason) {
      return rejected(reason);
    }

    // The commit message format is part of the repo history convention.
    const newMatch = next.matches[next.matches.length - 1];
    const message = `Add match ${newMatch.seq}: ${input.surface}${input.date ? ` on ${input.date}` : ""}`;
    await store.write(serializeDataset(next), message, version);

    // Return the full next dataset so the client refreshes immediately.
    return reply(200, { ok: true, seq: newMatch.seq, dataset: next });
  } catch (reason) {
    return toFailure(reason);
  }
}

// Replace one match by id. The sole precondition is that the CURRENTLY STORED
// match at `id` is unfinished; the submitted match may stay unfinished or become
// finished. Once finished, a later call for the same id is rejected — so decided
// history (original or just-completed) is immutable here.
export async function handleUpdateMatch(store: DatasetStore, body: unknown): Promise<PublishResult> {
  if (!isObject(body) || typeof body.id !== "string" || !body.match) {
    return reply(400, { error: "Expected a JSON body like { id, match: … }." });
  }
  const id = body.id;
  const input = body.match as NewMatchInput;

  try {
    const { current, version } = await store.read();

    const existing = current.matches.find((match) => match.id === id);
    if (!existing) {
      return reply(404, { error: `No match with id ${id}.` });
    }
    if (!isUnfinished(existing)) {
      return reply(422, { error: "That match is already finished and can't be updated." });
    }

    // Replace in place (id + seq preserved) and re-validate server-side.
    let next;
    try {
      next = validateDataset(replaceMatch(current, id, input));
    } catch (reason) {
      return rejected(reason);
    }

    const message = `Update match ${existing.seq}: ${input.surface}${input.date ? ` on ${input.date}` : ""}`;
    await store.write(serializeDataset(next), message, version);

    return reply(200, { ok: true, seq: existing.seq, dataset: next });
  } catch (reason) {
    return toFailure(reason);
  }
}
