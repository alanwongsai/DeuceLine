// Cloudflare Pages Function: POST /api/update-match
//
// The one-tap "complete / edit an in-progress match" endpoint. It replaces a
// single match by id, but ONLY when the stored match is still unfinished — so
// decided history stays immutable through this endpoint.
//
// Precondition semantics (kept identical in code and ENGINE.md so they can't be
// misread): the sole precondition is that the CURRENTLY STORED match at `id` has
// `status === "unfinished"`. The submitted match may stay unfinished (still
// suspended) or become finished (status omitted). Once it is finished, a later
// call for the same id is rejected — the stored match is no longer unfinished.
//
// This file is only the Cloudflare adapter; the gate and rules live in
// _publish.ts and are shared with the mini program's CloudBase cloud function.

import { Env, respond } from "./_cloudflare";
import { createGitHubStore } from "./_github";
import { checkPublishKey, handleUpdateMatch } from "./_publish";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = checkPublishKey(env, request.headers.get("x-deuceline-key"));
  if (denied) return respond(denied);

  // A body that isn't JSON is answered by the core's 400 shape check.
  const body: unknown = await request.json().catch(() => null);
  return respond(await handleUpdateMatch(createGitHubStore(env.GITHUB_TOKEN), body));
};
