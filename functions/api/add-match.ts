// Cloudflare Pages Function: POST /api/add-match
//
// The one-tap publish endpoint. The app posts a single new-match input; this
// function commits it to the repo's canonical JSON on Alan's behalf, so the app
// itself still never holds a GitHub token (the token is a Cloudflare secret).
//
// Security model (see the plan / ENGINE.md):
//  1. Password gate — the caller must send the shared password (a Cloudflare
//     secret). It is never in the public bundle, so a visitor with only the link
//     cannot reach the write path.
//  2. Append-only by construction — the client sends ONLY a new match. This
//     function re-reads the current dataset and runs the same appendMatch +
//     validateDataset the app uses, so the endpoint can add one match but can
//     never delete or rewrite existing matches, whatever the caller sends.
//  3. Least privilege — the token is a fine-grained PAT scoped to this one repo,
//     Contents-only. Every write is a commit, so any bad write is git-revertible.

import { appendMatch, NewMatchInput, serializeDataset } from "../../src/domain/addMatch";
import { DeucelineDataset } from "../../src/domain/schema";
import { DatasetValidationError, validateDataset } from "../../src/domain/validateDataset";

interface Env {
  GITHUB_TOKEN: string;
  ADD_MATCH_PASSWORD: string;
}

// The canonical dataset location — mirrors DATASET_EDIT_URL in src/data/datasetSource.ts.
const OWNER = "alanwongsai";
const REPO = "DeuceLine";
const BRANCH = "main";
const PATH = "public/data/deuceline-data.json";
const CONTENTS_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GITHUB_TOKEN || !env.ADD_MATCH_PASSWORD) {
    return json({ error: "Publisher is not configured." }, 500);
  }

  // 1. Password gate.
  const provided = request.headers.get("x-deuceline-key") ?? "";
  if (!constantTimeEqual(provided, env.ADD_MATCH_PASSWORD)) {
    return json({ error: "Wrong password." }, 401);
  }

  // 2. Read the new match (only a match — never the whole dataset).
  let input: NewMatchInput;
  try {
    const body = (await request.json()) as { match?: NewMatchInput };
    if (!body || typeof body !== "object" || !body.match) throw new Error("missing match");
    input = body.match;
  } catch {
    return json({ error: "Expected a JSON body like { match: … }." }, 400);
  }

  // 3. Read the current canonical dataset (content + sha).
  let current: DeucelineDataset;
  let sha: string;
  try {
    const res = await fetch(`${CONTENTS_API}?ref=${BRANCH}`, { headers: githubHeaders(env.GITHUB_TOKEN) });
    if (!res.ok) return json({ error: `Could not read dataset (${res.status}).` }, 502);
    const file = (await res.json()) as { content?: string; sha?: string };
    if (!file.content || !file.sha) return json({ error: "Dataset response was malformed." }, 502);
    sha = file.sha;
    current = validateDataset(JSON.parse(decodeBase64(file.content)));
  } catch {
    return json({ error: "Current dataset is unreadable." }, 502);
  }

  // 4. Append-only: re-append and re-validate server-side. This is the guard that
  //    makes deletion / history rewrites impossible through this endpoint.
  let next: DeucelineDataset;
  try {
    next = validateDataset(appendMatch(current, input));
  } catch (reason) {
    const issues = reason instanceof DatasetValidationError ? reason.issues : ["Invalid match."];
    return json({ error: "Match rejected.", issues }, 422);
  }

  // 5. Commit. Pushing to main triggers the Cloudflare Pages rebuild.
  const newMatch = next.matches[next.matches.length - 1];
  const message = `Add match ${newMatch.seq}: ${input.surface}${input.date ? ` on ${input.date}` : ""}`;
  const put = await fetch(CONTENTS_API, {
    method: "PUT",
    headers: { ...githubHeaders(env.GITHUB_TOKEN), "content-type": "application/json" },
    body: JSON.stringify({ message, content: encodeBase64(serializeDataset(next)), sha, branch: BRANCH }),
  });
  if (!put.ok) {
    return json({ error: `Commit failed (${put.status}).`, detail: await put.text() }, 502);
  }

  return json({ ok: true, seq: newMatch.seq, matches: next.matches.length }, 200);
};

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    // GitHub rejects requests without a User-Agent.
    "User-Agent": "deuceline-add-match",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Reject early on a length mismatch, then compare without short-circuiting so the
// password check doesn't leak character positions through timing.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// GitHub content is base64 (of UTF-8). Encode/decode through byte arrays so
// non-ASCII (names, notes) survives the round-trip.
function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
