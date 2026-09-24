// Deuceline cloud function — complete an unfinished match, then commit it.
//
// Same gate and same rules as the web's POST /api/update-match: the stored match at
// `id` must still be unfinished, the replacement is re-validated server-side, and the
// id/seq are preserved. A finished match cannot be updated here (no general match
// editing in v1 — see PROJECT_PLAN.md).
//
// Runtime   Node.js 18+.
// Env       GITHUB_TOKEN, ADD_MATCH_PASSWORD. Console: raise the timeout to ~20 s.
//
// event     { key: string, id: string, match: NewMatchInput }
// result    { status, body } — 200 { ok, seq, dataset } · 400 bad body ·
//           401 wrong password · 404 unknown id · 409 data changed, reload ·
//           422 rejected (with `issues`, or "already finished") · 500 not configured ·
//           502 GitHub/unexpected failure.

const { checkPublishKey, createGitHubStore, handleUpdateMatch } = require("./lib/deuceline-publisher.js");

exports.main = async (event) => {
  const denied = checkPublishKey(process.env, event.key);
  if (denied) return denied;
  return handleUpdateMatch(createGitHubStore(process.env.GITHUB_TOKEN), { id: event.id, match: event.match });
};
