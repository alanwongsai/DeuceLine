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
import { DatasetValidationError, validateDataset } from "../../src/domain/validateDataset";
import { commitDataset, constantTimeEqual, Env, GitHubOpError, json, readCurrentDataset } from "./_github";

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

  try {
    // 3. Read the current canonical dataset (content + sha).
    const { current, sha } = await readCurrentDataset(env.GITHUB_TOKEN);

    // 4. Append-only: re-append and re-validate server-side. This is the guard
    //    that makes deletion / history rewrites impossible through this endpoint.
    let next;
    try {
      next = validateDataset(appendMatch(current, input));
    } catch (reason) {
      const issues = reason instanceof DatasetValidationError ? reason.issues : ["Invalid match."];
      return json({ error: "Match rejected.", issues }, 422);
    }

    // 5. Commit. Pushing to main triggers the Cloudflare Pages rebuild. Return
    //    the full next dataset so the client can refresh local state immediately.
    const newMatch = next.matches[next.matches.length - 1];
    const message = `Add match ${newMatch.seq}: ${input.surface}${input.date ? ` on ${input.date}` : ""}`;
    await commitDataset(env.GITHUB_TOKEN, serializeDataset(next), message, sha);

    return json({ ok: true, seq: newMatch.seq, dataset: next }, 200);
  } catch (reason) {
    if (reason instanceof GitHubOpError) {
      return json({ error: reason.message, ...(reason.detail ? { detail: reason.detail } : {}) }, reason.status);
    }
    return json({ error: "Unexpected publish failure." }, 502);
  }
};
