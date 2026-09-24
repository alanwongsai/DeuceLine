// The leather cover — the journal's identity band, shared by both pages.
//
// Mirrors the web's `header.app-header.journal-cover` (src/pages/OverviewPage.tsx and
// MatchesPage.tsx): a three-column strip, crest · title · badge, where the badge sits
// top-right as a dashed gold rounded rectangle holding the version (Overview) or the
// chapter count (Matches).
//
// The leather itself is a CSS gradient band, not the web's 1.7 MB book plate — see
// MINIPROGRAM.md → "Design essence → Free to simplify → Assets".
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
