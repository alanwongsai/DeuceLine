// Deuceline cloud function — read the canonical dataset.
//
// A thin host adapter: it authenticates nothing, wires the GitHub store to the shared
// read handler, and returns that handler's result unchanged. The rules live once in
// ./lib/deuceline-publisher.js, which `npm run build:core` generates from
// functions/api/_mp-publisher.ts — never hand-edit it (see MINIPROGRAM.md).
//
// Runtime   Node.js 18+ (the store relies on global fetch / btoa / TextEncoder).
// Env       GITHUB_TOKEN — fine-grained PAT, this repo only, Contents read/write.
// Console   raise the timeout to ~20 s.
//
// Returns { status, body }: 200 { ok, dataset } · 500 not configured · 502 GitHub read
// failure. The mini program validates the dataset again on arrival, exactly as the web
// validates every read.

const { createGitHubStore, handleGetDataset } = require("./lib/deuceline-publisher.js");

exports.main = async () => {
  if (!process.env.GITHUB_TOKEN) {
    return { status: 500, body: { error: "Publisher is not configured." } };
  }
  return handleGetDataset(createGitHubStore(process.env.GITHUB_TOKEN));
};
