// Deuceline cloud function — append one match, then commit it.
//
// The caller must present the shared publish password (the same value as the web's
// ADD_MATCH_PASSWORD). checkPublishKey owns the gate and handleAddMatch owns the
// append-only rule plus the server-side re-validation — both come from the generated
// bundle, so the mini program cannot drift from the web on either.
//
// Runtime   Node.js 18+.
// Env       GITHUB_TOKEN, ADD_MATCH_PASSWORD. Console: raise the timeout to ~20 s.
//
// event     { key: string, match: NewMatchInput }
// result    { status, body } — 200 { ok, seq, dataset } · 400 bad body ·
//           401 wrong password · 422 rejected with `issues` · 500 not configured ·
//           502 GitHub/unexpected failure.
//
// On 200, refresh the UI from body.dataset — never re-fetch.

const { checkPublishKey, createGitHubStore, handleAddMatch } = require("./lib/deuceline-publisher.js");

exports.main = async (event) => {
  const denied = checkPublishKey(process.env, event.key);
  if (denied) return denied;
  return handleAddMatch(createGitHubStore(process.env.GITHUB_TOKEN), { match: event.match });
};
