// Public surface of the domain layer, for clients outside this web app. The
// WeChat mini program consumes it as the CommonJS bundle built by
// `npm run build:core` (dist-core/deuceline-domain.js) — see MINIPROGRAM.md.
// The web app keeps importing the individual modules directly.

export * from "./schema";
export * from "./validateDataset";
export * from "./deriveStats";
export * from "./addMatch";
