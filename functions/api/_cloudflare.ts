// Cloudflare-only glue for the Pages Functions: the secret bindings, the
// wrong-password limiter, and the mapping from the host-agnostic PublishResult
// onto a Response. Files whose name starts with "_" are not routed by Cloudflare Pages.

import { checkPublishKey, PublishResult } from "./_publish";
import { limitFailures } from "./_rateLimit";

// Secrets set in the Cloudflare dashboard (or .dev.vars for `wrangler pages dev`),
// plus the KV namespace bound as RATE_LIMIT (optional: without it, no limiter).
export interface Env {
  GITHUB_TOKEN: string;
  ADD_MATCH_PASSWORD: string;
  RATE_LIMIT?: KVNamespace;
}

// The password gate every Cloudflare Function runs first: the shared check,
// behind the per-IP wrong-password limiter (see _rateLimit.ts).
export function guardPublishKey(env: Env, request: Request): Promise<PublishResult | null> {
  return limitFailures(env.RATE_LIMIT, request.headers.get("cf-connecting-ip"), () =>
    checkPublishKey(env, request.headers.get("x-deuceline-key")),
  );
}

export function respond(result: PublishResult): Response {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
}
