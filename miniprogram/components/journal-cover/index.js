// The shared editorial header used by both mini program pages.
//
// Shares the web's serif journal direction (src/components/ThemeControls.tsx and
// src/pages/MatchesPage.tsx): a title and compact glass badge holding the version (Overview)
// or the chapter count (Matches). Visual direction and the future-client boundary
// are documented in MINIPROGRAM.md → "Design direction".
Component({
  properties: {
    title: {
      type: String,
      value: "Deuceline",
    },
    // Single-line badge text (e.g. "v0.11.6"). Ignored when countLabel is set.
    version: {
      type: String,
      value: "",
    },
    // Setting countLabel switches the badge to its two-row count form.
    count: {
      type: Number,
      value: 0,
    },
    countLabel: {
      type: String,
      value: "",
    },
  },

  data: {
    // Clear the status bar ourselves — the cover runs edge to edge under
    // `navigationStyle: "custom"` (see app.js, which owns this measurement).
    padTop: 20,
  },

  attached() {
    const app = getApp();
    this.setData({ padTop: (app && app.globalData && app.globalData.statusBarHeight) || 20 });
  },
});
