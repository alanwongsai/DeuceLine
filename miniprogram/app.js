// Deuceline mini program — app shell.
//
// There is no database and no client-side canonical storage: the single source of
// truth is the repo JSON (public/data/deuceline-data.json), reached through the
// CloudBase cloud functions. This file only initialises wx.cloud and captures the
// device chrome metrics the custom navigation needs.
const config = require("./config.js");

App({
  // The custom header runs edge to edge (`navigationStyle: "custom"` in app.json),
  // so pages must clear the status bar themselves. Single owner of that number.
  captureChrome() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.globalData.statusBarHeight = info.statusBarHeight || 20;
  },

  onLaunch() {
    this.captureChrome();
    if (!wx.cloud) {
      // wx.cloud needs base library 2.2.3+; without it no data can load at all.
      console.error("[deuceline] wx.cloud is unavailable — raise the base library version.");
      return;
    }
    // No `env` means "the account's default environment".
    wx.cloud.init(config.cloudEnv ? { env: config.cloudEnv, traceUser: true } : { traceUser: true });
  },

  onShow() {
    this.captureChrome();
  },

  globalData: {
    // The dataset the pages last loaded from `getDataset`. Never written back to any
    // store — from the client's point of view the dataset is read-only.
    dataset: null,
    statusBarHeight: 20,
  },
});
