// Cloudflare Pages Function: POST /api/check-key
//
// Lets the web app's spectator gate (the Hawk-Eye "OUT!" sheet) confirm the
// publish password before opening the add/update form on a new device. It runs
// the same shared gate as the write endpoints and touches nothing else, so it
// grants no access the write endpoints don't already check on every call.

import { Env, respond } from "./_cloudflare";
import { checkPublishKey } from "./_publish";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = checkPublishKey(env, request.headers.get("x-deuceline-key"));
  return respond(denied ?? { status: 200, body: { ok: true } });
};
