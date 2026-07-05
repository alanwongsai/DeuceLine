// Shared helpers for the write endpoints (add-match, update-match). Files whose
// name starts with "_" are not routed by Cloudflare Pages, so this is a plain
// module, not an endpoint. Keeping the GitHub plumbing here means the two
// endpoints can't drift on auth, encoding, or error handling.

import { DeucelineDataset } from "../../src/domain/schema";
import { validateDataset } from "../../src/domain/validateDataset";

export interface Env {
  GITHUB_TOKEN: string;
  ADD_MATCH_PASSWORD: string;
}

// The canonical dataset location — mirrors DATASET_EDIT_URL in src/data/datasetSource.ts.
const OWNER = "alanwongsai";
const REPO = "DeuceLine";
const BRANCH = "main";
const PATH = "public/data/deuceline-data.json";
const CONTENTS_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

// A GitHub/plumbing failure that already knows how it should surface to the
// client (status + user-facing message). Endpoints catch it and reply directly.
export class GitHubOpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "GitHubOpError";
  }
}

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    // GitHub rejects requests without a User-Agent.
    "User-Agent": "deuceline-add-match",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// Reject early on a length mismatch, then compare without short-circuiting so the
// password check doesn't leak character positions through timing.
export function constantTimeEqual(a: string, b: string): boolean {
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

// Reads and validates the current canonical dataset, plus the blob sha needed to
// commit the next version on top of it.
export async function readCurrentDataset(token: string): Promise<{ current: DeucelineDataset; sha: string }> {
  const res = await fetch(`${CONTENTS_API}?ref=${BRANCH}`, { headers: githubHeaders(token) });
  if (!res.ok) throw new GitHubOpError(502, `Could not read dataset (${res.status}).`);
  const file = (await res.json()) as { content?: string; sha?: string };
  if (!file.content || !file.sha) throw new GitHubOpError(502, "Dataset response was malformed.");
  try {
    return { current: validateDataset(JSON.parse(decodeBase64(file.content))), sha: file.sha };
  } catch {
    throw new GitHubOpError(502, "Current dataset is unreadable.");
  }
}

// Commits the serialized dataset. A stale `sha` (someone else committed since we
// read) returns 409 — surface it as a retry-after-reload message rather than a
// generic failure, so the client can tell the user to reload.
export async function commitDataset(token: string, serialized: string, message: string, sha: string): Promise<void> {
  const put = await fetch(CONTENTS_API, {
    method: "PUT",
    headers: { ...githubHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({ message, content: encodeBase64(serialized), sha, branch: BRANCH }),
  });
  if (put.status === 409) {
    throw new GitHubOpError(409, "The data changed since you loaded it — reload and try again.");
  }
  if (!put.ok) {
    throw new GitHubOpError(502, `Commit failed (${put.status}).`, await put.text());
  }
}
