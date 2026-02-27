(() => {
  const STORAGE_KEY = "overlaySettings";
  const POPUP_MODE_KEY = "overlayPopupMode";
  const MODE_KEYS = ["fullscreen", "theater", "normal"];
  const OFFSET_MAX_X_BASE = 1920;
  const OFFSET_MAX_Y_BASE = 1080;

  const DEFAULT_MODE_PROFILE = {
    maxVisible: 8,
    ttlMs: 9000,
    fadeMs: 300,
    sequentialFadeSec: 0.3,
    laneWidthPercent: 44,
    fontSizePx: 22,
    fontWeight: 900,
    avatarSizePx: 44,
    rowGapPx: 10,
    horizontalAlign: "left",
    verticalAlign: "bottom",
    offsetXPx: 12,
    offsetYPx: 24,
    strokePx: 1.6,
    textOpacity: 1,
    messageBgOpacity: 0.28,
    showAvatar: true,
    showAuthorName: true
  };

  function createModeProfiles(profile) {
    return {
      fullscreen: { ...profile },
      theater: { ...profile },
      normal: { ...profile }
    };
  }

  const DEFAULT_SETTINGS = {
    enabledModes: {
      fullscreen: true,
      theater: true,
      normal: true
    },
    modeProfiles: createModeProfiles(DEFAULT_MODE_PROFILE)
  };

  const NUMERIC_FIELDS = {
    maxVisible: { min: 1, max: 20, step: 1, fallback: DEFAULT_MODE_PROFILE.maxVisible },
    ttlMs: { min: 1000, max: 30000, step: 100, fallback: DEFAULT_MODE_PROFILE.ttlMs },
    fadeMs: { min: 0, max: 2000, step: 10, fallback: DEFAULT_MODE_PROFILE.fadeMs },
    sequentialFadeSec: {
      min: 0,
      max: 10,
      step: 0.1,
      fallback: DEFAULT_MODE_PROFILE.sequentialFadeSec
    },
    laneWidthPercent: {
      min: 20,
      max: 80,
      step: 1,
      fallback: DEFAULT_MODE_PROFILE.laneWidthPercent
    },
    fontSizePx: { min: 12, max: 64, step: 1, fallback: DEFAULT_MODE_PROFILE.fontSizePx },
    fontWeight: { min: 100, max: 900, step: 100, fallback: DEFAULT_MODE_PROFILE.fontWeight },
    avatarSizePx: {
      min: 24,
      max: 96,
      step: 1,
      fallback: DEFAULT_MODE_PROFILE.avatarSizePx
    },
    rowGapPx: { min: 0, max: 24, step: 1, fallback: DEFAULT_MODE_PROFILE.rowGapPx },
    offsetXPx: {
      min: 0,
      max: OFFSET_MAX_X_BASE,
      step: 1,
      fallback: DEFAULT_MODE_PROFILE.offsetXPx
    },
    offsetYPx: {
      min: 0,
      max: OFFSET_MAX_Y_BASE,
      step: 1,
      fallback: DEFAULT_MODE_PROFILE.offsetYPx
    },
    strokePx: { min: 0, max: 4, step: 0.1, fallback: DEFAULT_MODE_PROFILE.strokePx },
    textOpacity: { min: 0.1, max: 1, step: 0.05, fallback: DEFAULT_MODE_PROFILE.textOpacity },
    messageBgOpacity: {
      min: 0,
      max: 0.9,
      step: 0.05,
      fallback: DEFAULT_MODE_PROFILE.messageBgOpacity
    }
  };

  const PROFILE_SELECT_FIELDS = {
    horizontalAlign: {
      values: ["left", "right"],
      fallback: DEFAULT_MODE_PROFILE.horizontalAlign
    },
    verticalAlign: {
      values: ["bottom", "top"],
      fallback: DEFAULT_MODE_PROFILE.verticalAlign
    }
  };

  const MODE_CHECKBOX_IDS = ["modeFullscreen", "modeTheater", "modeNormal"];
  const PROFILE_CHECKBOX_IDS = ["showAvatar", "showAuthorName"];
  const PROFILE_NUMERIC_IDS = Object.keys(NUMERIC_FIELDS);
  const PROFILE_SELECT_IDS = Object.keys(PROFILE_SELECT_FIELDS);

  const form = document.getElementById("settings-form");
  const resetButton = document.getElementById("resetButton");
  const statusNode = document.getElementById("status");
  const profileModeNode = document.getElementById("profileMode");

  let saveInFlight = false;
  let saveRequested = false;
  let statusTimer = 0;
  let selectedMode = "fullscreen";
  let currentSettings = normalizeSettings(DEFAULT_SETTINGS);

  function clampNumber(value, min, max, fallback, step) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    let next = numeric;
    if (next < min) {
      next = min;
    }
    if (next > max) {
      next = max;
    }
    if (step >= 1) {
      return Math.round(next);
    }
    const digits = (String(step).split(".")[1] || "").length;
    return Number(next.toFixed(digits));
  }

  function normalizeModeProfile(rawProfile, fallbackProfile) {
    const input = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
    const fallback =
      fallbackProfile && typeof fallbackProfile === "object"
        ? fallbackProfile
        : DEFAULT_MODE_PROFILE;

    const horizontalAlign = PROFILE_SELECT_FIELDS.horizontalAlign.values.includes(
      input.horizontalAlign
    )
      ? input.horizontalAlign
      : fallback.horizontalAlign;

    const verticalAlign = PROFILE_SELECT_FIELDS.verticalAlign.values.includes(
      input.verticalAlign
    )
      ? input.verticalAlign
      : fallback.verticalAlign;

    const offsetXInput =
      typeof input.offsetXPx !== "undefined" ? input.offsetXPx : input.leftOffsetPx;
    const offsetYInput =
      typeof input.offsetYPx !== "undefined" ? input.offsetYPx : input.bottomOffsetPx;

    return {
      maxVisible: clampNumber(
        input.maxVisible,
        NUMERIC_FIELDS.maxVisible.min,
        NUMERIC_FIELDS.maxVisible.max,
        fallback.maxVisible,
        NUMERIC_FIELDS.maxVisible.step
      ),
      ttlMs: clampNumber(
        input.ttlMs,
        NUMERIC_FIELDS.ttlMs.min,
        NUMERIC_FIELDS.ttlMs.max,
        fallback.ttlMs,
        NUMERIC_FIELDS.ttlMs.step
      ),
      fadeMs: clampNumber(
        input.fadeMs,
        NUMERIC_FIELDS.fadeMs.min,
        NUMERIC_FIELDS.fadeMs.max,
        fallback.fadeMs,
        NUMERIC_FIELDS.fadeMs.step
      ),
      sequentialFadeSec: clampNumber(
        input.sequentialFadeSec,
        NUMERIC_FIELDS.sequentialFadeSec.min,
        NUMERIC_FIELDS.sequentialFadeSec.max,
        fallback.sequentialFadeSec,
        NUMERIC_FIELDS.sequentialFadeSec.step
      ),
      laneWidthPercent: clampNumber(
        input.laneWidthPercent,
        NUMERIC_FIELDS.laneWidthPercent.min,
        NUMERIC_FIELDS.laneWidthPercent.max,
        fallback.laneWidthPercent,
        NUMERIC_FIELDS.laneWidthPercent.step
      ),
      fontSizePx: clampNumber(
        input.fontSizePx,
        NUMERIC_FIELDS.fontSizePx.min,
        NUMERIC_FIELDS.fontSizePx.max,
        fallback.fontSizePx,
        NUMERIC_FIELDS.fontSizePx.step
      ),
      fontWeight: clampNumber(
        input.fontWeight,
        NUMERIC_FIELDS.fontWeight.min,
        NUMERIC_FIELDS.fontWeight.max,
        fallback.fontWeight,
        NUMERIC_FIELDS.fontWeight.step
      ),
      avatarSizePx: clampNumber(
        input.avatarSizePx,
        NUMERIC_FIELDS.avatarSizePx.min,
        NUMERIC_FIELDS.avatarSizePx.max,
        fallback.avatarSizePx,
        NUMERIC_FIELDS.avatarSizePx.step
      ),
      rowGapPx: clampNumber(
        input.rowGapPx,
        NUMERIC_FIELDS.rowGapPx.min,
        NUMERIC_FIELDS.rowGapPx.max,
        fallback.rowGapPx,
        NUMERIC_FIELDS.rowGapPx.step
      ),
      horizontalAlign,
      verticalAlign,
      offsetXPx: clampNumber(
        offsetXInput,
        NUMERIC_FIELDS.offsetXPx.min,
        NUMERIC_FIELDS.offsetXPx.max,
        fallback.offsetXPx,
        NUMERIC_FIELDS.offsetXPx.step
      ),
      offsetYPx: clampNumber(
        offsetYInput,
        NUMERIC_FIELDS.offsetYPx.min,
        NUMERIC_FIELDS.offsetYPx.max,
        fallback.offsetYPx,
        NUMERIC_FIELDS.offsetYPx.step
      ),
      strokePx: clampNumber(
        input.strokePx,
        NUMERIC_FIELDS.strokePx.min,
        NUMERIC_FIELDS.strokePx.max,
        fallback.strokePx,
        NUMERIC_FIELDS.strokePx.step
      ),
      textOpacity: clampNumber(
        input.textOpacity,
        NUMERIC_FIELDS.textOpacity.min,
        NUMERIC_FIELDS.textOpacity.max,
        fallback.textOpacity,
        NUMERIC_FIELDS.textOpacity.step
      ),
      messageBgOpacity: clampNumber(
        input.messageBgOpacity,
        NUMERIC_FIELDS.messageBgOpacity.min,
        NUMERIC_FIELDS.messageBgOpacity.max,
        fallback.messageBgOpacity,
        NUMERIC_FIELDS.messageBgOpacity.step
      ),
      showAvatar:
        typeof input.showAvatar === "boolean" ? input.showAvatar : fallback.showAvatar,
      showAuthorName:
        typeof input.showAuthorName === "boolean"
          ? input.showAuthorName
          : fallback.showAuthorName
    };
  }

  function buildLegacyScaledProfile(baseProfile, scale) {
    const s = clampNumber(scale, 0.4, 2.5, 1, 0.05);
    return normalizeModeProfile(
      {
        ...baseProfile,
        fontSizePx: Math.round(baseProfile.fontSizePx * s),
        avatarSizePx: Math.round(baseProfile.avatarSizePx * s),
        rowGapPx: Math.round(baseProfile.rowGapPx * s),
        strokePx: baseProfile.strokePx * s
      },
      baseProfile
    );
  }

  function normalizeSettings(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const modeInput =
      input.enabledModes && typeof input.enabledModes === "object"
        ? input.enabledModes
        : {};
    const modeProfilesInput =
      input.modeProfiles && typeof input.modeProfiles === "object"
        ? input.modeProfiles
        : {};
    const modeSizeScaleInput =
      input.modeSizeScale && typeof input.modeSizeScale === "object"
        ? input.modeSizeScale
        : {};

    const legacyBaseProfile = normalizeModeProfile(input, DEFAULT_MODE_PROFILE);
    const legacyScale = {
      fullscreen: clampNumber(modeSizeScaleInput.fullscreen, 0.4, 2.5, 1, 0.05),
      theater: clampNumber(modeSizeScaleInput.theater, 0.4, 2.5, 1, 0.05),
      normal: clampNumber(modeSizeScaleInput.normal, 0.4, 2.5, 1, 0.05)
    };

    const modeProfiles = createModeProfiles(DEFAULT_MODE_PROFILE);
    for (const mode of MODE_KEYS) {
      const fallbackProfile = buildLegacyScaledProfile(legacyBaseProfile, legacyScale[mode]);
      modeProfiles[mode] = normalizeModeProfile(modeProfilesInput[mode], fallbackProfile);
    }

    return {
      enabledModes: {
        fullscreen:
          typeof modeInput.fullscreen === "boolean"
            ? modeInput.fullscreen
            : DEFAULT_SETTINGS.enabledModes.fullscreen,
        theater:
          typeof modeInput.theater === "boolean"
            ? modeInput.theater
            : DEFAULT_SETTINGS.enabledModes.theater,
        normal:
          typeof modeInput.normal === "boolean"
            ? modeInput.normal
            : DEFAULT_SETTINGS.enabledModes.normal
      },
      modeProfiles
    };
  }

  function storageGet(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result || {});
      });
    });
  }

  function storageSet(value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(value, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function persistSelectedMode() {
    storageSet({ [POPUP_MODE_KEY]: selectedMode }).catch((error) => {
      console.error(error);
    });
  }

  function setStatus(message, isError) {
    if (!statusNode) {
      return;
    }

    statusNode.textContent = message;
    statusNode.classList.toggle("error", Boolean(isError));

    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }
    if (message) {
      statusTimer = window.setTimeout(() => {
        statusNode.textContent = "";
        statusNode.classList.remove("error");
      }, 1200);
    }
  }

  function getCurrentProfile() {
    return currentSettings.modeProfiles[selectedMode] || DEFAULT_MODE_PROFILE;
  }

  function setProfileFields(profile) {
    const targetProfile = profile || DEFAULT_MODE_PROFILE;

    for (const id of PROFILE_CHECKBOX_IDS) {
      const node = document.getElementById(id);
      if (node) {
        node.checked = Boolean(targetProfile[id]);
      }
    }

    for (const id of PROFILE_SELECT_IDS) {
      const node = document.getElementById(id);
      if (node) {
        node.value = String(targetProfile[id]);
      }
    }

    for (const id of PROFILE_NUMERIC_IDS) {
      const node = document.getElementById(id);
      if (node) {
        node.value = String(targetProfile[id]);
      }
    }
  }

  function renderFormFromState() {
    const modeFullscreen = document.getElementById("modeFullscreen");
    const modeTheater = document.getElementById("modeTheater");
    const modeNormal = document.getElementById("modeNormal");

    if (modeFullscreen) {
      modeFullscreen.checked = Boolean(currentSettings.enabledModes.fullscreen);
    }
    if (modeTheater) {
      modeTheater.checked = Boolean(currentSettings.enabledModes.theater);
    }
    if (modeNormal) {
      modeNormal.checked = Boolean(currentSettings.enabledModes.normal);
    }

    if (profileModeNode) {
      profileModeNode.value = selectedMode;
    }

    setProfileFields(getCurrentProfile());
  }

  async function saveCurrentSettings() {
    try {
      currentSettings = normalizeSettings(currentSettings);
      await storageSet({ [STORAGE_KEY]: currentSettings });
      setStatus("保存しました", false);
    } catch (error) {
      setStatus("保存に失敗しました", true);
      console.error(error);
    }
  }

  async function flushSaveQueue() {
    if (saveInFlight) {
      return;
    }

    saveInFlight = true;
    try {
      while (saveRequested) {
        saveRequested = false;
        await saveCurrentSettings();
      }
    } finally {
      saveInFlight = false;
    }
  }

  function queueSave() {
    saveRequested = true;
    flushSaveQueue();
  }

  function updateCurrentProfileField(id, value) {
    const profile = getCurrentProfile();
    profile[id] = value;
  }

  function handleControlChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
      return;
    }

    const id = target.id;
    if (!id) {
      return;
    }

    if (id === "profileMode") {
      const nextMode = String(target.value || "");
      if (MODE_KEYS.includes(nextMode)) {
        selectedMode = nextMode;
        setProfileFields(getCurrentProfile());
        persistSelectedMode();
      }
      return;
    }

    if (MODE_CHECKBOX_IDS.includes(id)) {
      if (id === "modeFullscreen") {
        currentSettings.enabledModes.fullscreen = target.checked;
      }
      if (id === "modeTheater") {
        currentSettings.enabledModes.theater = target.checked;
      }
      if (id === "modeNormal") {
        currentSettings.enabledModes.normal = target.checked;
      }
      queueSave();
      return;
    }

    if (PROFILE_CHECKBOX_IDS.includes(id) && target instanceof HTMLInputElement) {
      updateCurrentProfileField(id, target.checked);
      queueSave();
      return;
    }

    if (PROFILE_SELECT_IDS.includes(id) && target instanceof HTMLSelectElement) {
      const meta = PROFILE_SELECT_FIELDS[id];
      const value = meta.values.includes(target.value) ? target.value : meta.fallback;
      target.value = value;
      updateCurrentProfileField(id, value);
      queueSave();
      return;
    }

    if (PROFILE_NUMERIC_IDS.includes(id) && target instanceof HTMLInputElement) {
      const meta = NUMERIC_FIELDS[id];
      const fallback = getCurrentProfile()[id];
      const clamped = clampNumber(
        target.value,
        meta.min,
        meta.max,
        fallback,
        meta.step
      );
      target.value = String(clamped);
      updateCurrentProfileField(id, clamped);
      queueSave();
    }
  }

  async function loadInitialSettings() {
    try {
      const result = await storageGet([STORAGE_KEY, POPUP_MODE_KEY]);
      currentSettings = normalizeSettings(result[STORAGE_KEY]);
      const savedMode = String(result[POPUP_MODE_KEY] || "");
      selectedMode = MODE_KEYS.includes(savedMode) ? savedMode : "fullscreen";
      renderFormFromState();
    } catch (error) {
      currentSettings = normalizeSettings(DEFAULT_SETTINGS);
      selectedMode = "fullscreen";
      renderFormFromState();
      setStatus("設定読み込みに失敗しました", true);
      console.error(error);
    }
  }

  function bindEvents() {
    if (form) {
      form.addEventListener("input", handleControlChange);
      form.addEventListener("change", handleControlChange);
    }

    if (resetButton) {
      resetButton.addEventListener("click", async () => {
        currentSettings = normalizeSettings(DEFAULT_SETTINGS);
        selectedMode = "fullscreen";
        renderFormFromState();
        await saveCurrentSettings();
        persistSelectedMode();
      });
    }
  }

  bindEvents();
  loadInitialSettings();
})();
