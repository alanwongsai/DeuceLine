// Cloudflare Pages Function: POST /api/add-match
//
// The one-tap publish endpoint. The app posts a single new-match input; this
// function commits it to the repo's canonical JSON on Alan's behalf, so the app
// itself still never holds a GitHub token (the token is a Cloudflare secret).
//
// Security model (see ENGINE.md, Data Update Flow):
//  1. Password gate — the caller must send the shared password (a Cloudflare
//     secret) in the x-deuceline-key header. It is never in the public bundle.
//  2. Append-only by construction — the client sends ONLY a new match; the core
//     re-reads the dataset and re-runs appendMatch + validateDataset, so the
//     endpoint can add one match but never delete or rewrite existing ones.
//  3. Least privilege — the token is a fine-grained PAT scoped to this one repo,
//     Contents-only. Every write is a commit, so any bad write is git-revertible.
//
// This file is only the Cloudflare adapter; the rules live in _publish.ts and are
// shared with the mini program's CloudBase cloud function.

import { Env, respond } from "./_cloudflare";
import { createGitHubStore } from "./_github";
import { checkPublishKey, handleAddMatch } from "./_publish";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = checkPublishKey(env, request.headers.get("x-deuceline-key"));
  if (denied) return respond(denied);

  // A body that isn't JSON is answered by the core's 400 shape check.
  const body: unknown = await request.json().catch(() => null);
  return respond(await handleAddMatch(createGitHubStore(env.GITHUB_TOKEN), body));
};
