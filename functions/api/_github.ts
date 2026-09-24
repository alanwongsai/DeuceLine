// The canonical DatasetStore: the repo JSON, read and committed through the
// GitHub Contents API. Files whose name starts with "_" are not routed by
// Cloudflare Pages, so this is a plain module. It uses only web-standard globals
// (fetch, btoa/atob, TextEncoder/TextDecoder), so the same code runs in a
// Cloudflare Pages Function and in a Node 18+ CloudBase cloud function.

import { validateDataset } from "../../src/domain/validateDataset";
import { DatasetStore, PublishError } from "./_publish";

// The canonical dataset location — mirrors DATASET_EDIT_URL in src/data/datasetSource.ts.
const OWNER = "alanwongsai";
const REPO = "DeuceLine";
const BRANCH = "main";
const PATH = "public/data/deuceline-data.json";
const CONTENTS_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    // GitHub rejects requests without a User-Agent.
    "User-Agent": "deuceline-add-match",
    "X-GitHub-Api-Version": "2022-11-28",
  };
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

// `token` is a fine-grained PAT scoped to this repo, Contents-only.
export function createGitHubStore(token: string): DatasetStore {
  return {
    // Reads and validates the current canonical dataset, plus the blob sha needed
    // to commit the next version on top of it.
    async read() {
      const res = await fetch(`${CONTENTS_API}?ref=${BRANCH}`, { headers: githubHeaders(token) });
      if (!res.ok) throw new PublishError(502, `Could not read dataset (${res.status}).`);
      const file = (await res.json()) as { content?: string; sha?: string };
      if (!file.content || !file.sha) throw new PublishError(502, "Dataset response was malformed.");
      try {
        return { current: validateDataset(JSON.parse(decodeBase64(file.content))), version: file.sha };
      } catch {
        throw new PublishError(502, "Current dataset is unreadable.");
      }
    },

    // Commits the serialized dataset. A stale sha (someone else committed since we
    // read) returns 409 — surface it as a retry-after-reload message rather than a
    // generic failure, so the client can tell the user to reload.
    async write(serialized, message, version) {
      const put = await fetch(CONTENTS_API, {
        method: "PUT",
        headers: { ...githubHeaders(token), "content-type": "application/json" },
        body: JSON.stringify({ message, content: encodeBase64(serialized), sha: version, branch: BRANCH }),
      });
      if (put.status === 409) {
        throw new PublishError(409, "The data changed since you loaded it — reload and try again.");
      }
      if (!put.ok) {
        throw new PublishError(502, `Commit failed (${put.status}).`, await put.text());
      }
    },
  };
}
