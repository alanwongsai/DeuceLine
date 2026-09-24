// Entry for `npm run build:core`'s publisher bundle (dist-core/deuceline-publisher.js),
// which the mini program's CloudBase cloud functions `require` — see MINIPROGRAM.md.
// Not used by the Cloudflare Functions themselves; "_" keeps it unrouted.

export { checkPublishKey, handleAddMatch, handleGetDataset, handleUpdateMatch, PublishError } from "./_publish";
export type { DatasetStore, PublishConfig, PublishResult } from "./_publish";
export { createGitHubStore } from "./_github";
