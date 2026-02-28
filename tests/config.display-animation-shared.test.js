const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadConfigApi() {
  const source = fs.readFileSync(path.join(process.cwd(), "config.js"), "utf8");
  const windowObject = {};
  windowObject.top = windowObject;
  windowObject.window = windowObject;

  const sandbox = {
    window: windowObject,
    console,
    Set,
    Map,
    Math,
    Number,
    String,
    Object
  };

  vm.runInNewContext(source, sandbox, { filename: "config.js" });
  return sandbox.window.YTChatOverlayConfig;
}

function forEachPanelMode(configApi, callback) {
  for (const panelState of configApi.PANEL_STATE_KEYS) {
    for (const mode of configApi.MODE_KEYS) {
      callback(panelState, mode);
    }
  }
}

test("maxVisibleは個別維持し、他の表示・アニメーション設定は全プロファイル共通化される", () => {
  const configApi = loadConfigApi();
  const normalized = configApi.normalizeConfig({
    maxVisible: 12,
    fadeOutTrigger: "overflow",
    animationPreset: "flip",
    ttlMs: 15000,
    fadeMs: 640,
    sequentialFadeSec: 1.4,
    panelModeProfiles: {
      open: {
        fullscreen: { maxVisible: 2, ttlMs: 2000, fadeMs: 100, sequentialFadeSec: 0.1 },
        theater: { maxVisible: 3, ttlMs: 2100, fadeMs: 120, sequentialFadeSec: 0.2 },
        normal: { maxVisible: 4, ttlMs: 2200, fadeMs: 140, sequentialFadeSec: 0.3 }
      },
      closed: {
        fullscreen: { maxVisible: 5, ttlMs: 2300, fadeMs: 160, sequentialFadeSec: 0.4 },
        theater: { maxVisible: 6, ttlMs: 2400, fadeMs: 180, sequentialFadeSec: 0.5 },
        normal: { maxVisible: 7, ttlMs: 2500, fadeMs: 200, sequentialFadeSec: 0.6 }
      }
    }
  });

  const expectedMaxVisibleByProfile = {
    open: { fullscreen: 2, theater: 3, normal: 4 },
    closed: { fullscreen: 5, theater: 6, normal: 7 }
  };

  forEachPanelMode(configApi, (panelState, mode) => {
    const profile = normalized.panelModeProfiles[panelState][mode];
    assert.equal(profile.maxVisible, expectedMaxVisibleByProfile[panelState][mode]);
    assert.equal(profile.fadeOutTrigger, "overflow");
    assert.equal(profile.animationPreset, "flip");
    assert.equal(profile.ttlMs, 15000);
    assert.equal(profile.fadeMs, 640);
    assert.equal(profile.sequentialFadeSec, 1.4);
  });
});

test("不正値入力時もmaxVisibleは個別正規化され、共通化対象は全プロファイル一致する", () => {
  const configApi = loadConfigApi();
  const normalized = configApi.normalizeConfig({
    maxVisible: "invalid",
    fadeOutTrigger: "invalid",
    animationPreset: "invalid",
    ttlMs: "invalid",
    fadeMs: "invalid",
    sequentialFadeSec: "invalid",
    panelModeProfiles: {
      open: {
        fullscreen: { maxVisible: 2 },
        theater: { maxVisible: 999 },
        normal: { maxVisible: -1 }
      },
      closed: {
        fullscreen: {
          maxVisible: "bad",
          fadeOutTrigger: "timer",
          animationPreset: "stretch",
          ttlMs: 8000,
          fadeMs: 420,
          sequentialFadeSec: 0.8
        },
        theater: { maxVisible: 6 },
        normal: { maxVisible: 7 }
      }
    }
  });

  const expectedMaxVisibleByProfile = {
    open: { fullscreen: 2, theater: 20, normal: 1 },
    closed: { fullscreen: configApi.DEFAULT_MODE_PROFILE.maxVisible, theater: 6, normal: 7 }
  };

  forEachPanelMode(configApi, (panelState, mode) => {
    const profile = normalized.panelModeProfiles[panelState][mode];
    assert.equal(profile.maxVisible, expectedMaxVisibleByProfile[panelState][mode]);
    assert.equal(profile.fadeOutTrigger, "timer");
    assert.equal(profile.animationPreset, "stretch");
    assert.equal(profile.ttlMs, 8000);
    assert.equal(profile.fadeMs, 420);
    assert.equal(profile.sequentialFadeSec, 0.8);
  });
});
