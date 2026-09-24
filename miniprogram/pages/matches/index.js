// Matches — the complete archive (every match, including unfinished ones).
//
// Shell only: the archive list, surface filter chips and chapter rows land in
// phase 2, where the cover badge switches from the version to the chapter count.
// All derived figures come from lib/deuceline-domain.js.
const { version } = require("../../lib/deuceline-version.js");

Page({
  data: {
    version: `v${version}`,
  },
});
