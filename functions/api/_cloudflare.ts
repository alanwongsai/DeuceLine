// Cloudflare-only glue for the Pages Functions: the secret bindings and the
// mapping from the host-agnostic PublishResult onto a Response. Files whose name
// starts with "_" are not routed by Cloudflare Pages.

import { PublishResult } from "./_publish";

// Secrets set in the Cloudflare dashboard (or .dev.vars for `wrangler pages dev`).
export interface Env {
  GITHUB_TOKEN: string;
  ADD_MATCH_PASSWORD: string;
}

export function respond(result: PublishResult): Response {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
}
