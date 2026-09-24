// Overview — current state of the rivalry.
//
// Shell only: this step (phase 0) proves the project skeleton and the generated
// shared core. The dataset read path lands in phase 1, the journal composition in
// phase 2. All derived figures come from lib/deuceline-domain.js — never re-derived
// here (see MINIPROGRAM.md).
const { version } = require("../../lib/deuceline-version.js");

Page({
  data: {
    version: `v${version}`,
  },
});
