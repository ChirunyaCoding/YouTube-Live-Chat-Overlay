(() => {
  if (window.top !== window) {
    return;
  }

  /**
   * @typedef {Object} OverlayMessageRun
   * @property {"text"|"emoji"} type
   * @property {string} [text]
   * @property {string} [src]
   * @property {string} [alt]
   */

  /**
   * @typedef {Object} OverlayAuthorBadge
   * @property {string} iconUrl
   * @property {string} label
   */

  /**
   * @typedef {Object} OverlayMessage
   * @property {string} id
   * @property {string} type
   * @property {string} authorName
   * @property {string} authorAvatarUrl
   * @property {string} text
   * @property {OverlayMessageRun[]} messageRuns
   * @property {OverlayAuthorBadge[]} authorBadges
   * @property {number} timestampMs
   * @property {string} accentColor
   * @property {number} priority
   */

  /**
   * @typedef {Object} OverlayModeProfile
   * @property {number} maxVisible
   * @property {number} ttlMs
   * @property {number} fadeMs
   * @property {number} sequentialFadeSec
   * @property {number} laneWidthPercent
   * @property {number} fontSizePx
   * @property {number} fontWeight
   * @property {number} avatarSizePx
   * @property {number} rowGapPx
   * @property {"left"|"right"} horizontalAlign
   * @property {"top"|"bottom"} verticalAlign
   * @property {number} offsetXPx
   * @property {number} offsetYPx
   * @property {number} strokePx
   * @property {number} textOpacity
   * @property {number} messageBgOpacity
   * @property {boolean} showAvatar
   * @property {boolean} showAuthorName
   */

  /**
   * @typedef {Object} OverlayConfig
   * @property {{fullscreen: boolean, theater: boolean, normal: boolean}} enabledModes
   * @property {{fullscreen: OverlayModeProfile, theater: OverlayModeProfile, normal: OverlayModeProfile}} modeProfiles
   * @property {number} maxVisible
   * @property {number} ttlMs
   * @property {number} fadeMs
   * @property {number} sequentialFadeSec
   * @property {number} laneWidthPercent
   * @property {number} fontSizePx
   * @property {number} fontWeight
   * @property {number} avatarSizePx
   * @property {number} rowGapPx
   * @property {"left"|"right"} horizontalAlign
   * @property {"top"|"bottom"} verticalAlign
   * @property {number} offsetXPx
   * @property {number} offsetYPx
   * @property {number} strokePx
   * @property {number} textOpacity
   * @property {number} messageBgOpacity
   * @property {boolean} showAvatar
   * @property {boolean} showAuthorName
   */

  const STORAGE_KEY = "overlaySettings";
  const MODE_KEYS = ["fullscreen", "theater", "normal"];
  const OFFSET_MAX_X_BASE = 1920;
  const OFFSET_MAX_Y_BASE = 1080;

  /** @type {OverlayModeProfile} */
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

  function createModeProfiles(modeProfile) {
    return {
      fullscreen: { ...modeProfile },
      theater: { ...modeProfile },
      normal: { ...modeProfile }
    };
  }

  /** @type {OverlayConfig} */
  const DEFAULT_CONFIG = {
    enabledModes: {
      fullscreen: true,
      theater: true,
      normal: true
    },
    modeProfiles: createModeProfiles(DEFAULT_MODE_PROFILE),
    maxVisible: DEFAULT_MODE_PROFILE.maxVisible,
    ttlMs: DEFAULT_MODE_PROFILE.ttlMs,
    fadeMs: DEFAULT_MODE_PROFILE.fadeMs,
    sequentialFadeSec: DEFAULT_MODE_PROFILE.sequentialFadeSec,
    laneWidthPercent: DEFAULT_MODE_PROFILE.laneWidthPercent,
    fontSizePx: DEFAULT_MODE_PROFILE.fontSizePx,
    fontWeight: DEFAULT_MODE_PROFILE.fontWeight,
    avatarSizePx: DEFAULT_MODE_PROFILE.avatarSizePx,
    rowGapPx: DEFAULT_MODE_PROFILE.rowGapPx,
    horizontalAlign: DEFAULT_MODE_PROFILE.horizontalAlign,
    verticalAlign: DEFAULT_MODE_PROFILE.verticalAlign,
    offsetXPx: DEFAULT_MODE_PROFILE.offsetXPx,
    offsetYPx: DEFAULT_MODE_PROFILE.offsetYPx,
    strokePx: DEFAULT_MODE_PROFILE.strokePx,
    textOpacity: DEFAULT_MODE_PROFILE.textOpacity,
    messageBgOpacity: DEFAULT_MODE_PROFILE.messageBgOpacity,
    showAvatar: DEFAULT_MODE_PROFILE.showAvatar,
    showAuthorName: DEFAULT_MODE_PROFILE.showAuthorName
  };

  const OVERLAY_ROOT_ID = "yt-chat-overlay-root";
  const OVERLAY_LANE_ID = "yt-chat-overlay-lane";

  const RENDERER_SELECTOR = [
    "yt-live-chat-text-message-renderer",
    "yt-live-chat-paid-message-renderer",
    "yt-live-chat-membership-item-renderer",
    "yt-live-chat-paid-sticker-renderer",
    "yt-live-chat-viewer-engagement-message-renderer",
    "yt-live-chat-mode-change-message-renderer"
  ].join(",");

  const TYPE_INFO = {
    text: {
      label: "",
      priority: 1,
      fallbackColor: "rgb(43, 201, 99)"
    },
    paid: {
      label: "SUPER CHAT",
      priority: 3,
      fallbackColor: "rgb(247, 158, 27)"
    },
    membership: {
      label: "MEMBER",
      priority: 2,
      fallbackColor: "rgb(79, 172, 254)"
    },
    sticker: {
      label: "STICKER",
      priority: 3,
      fallbackColor: "rgb(244, 114, 182)"
    },
    engagement: {
      label: "NOTICE",
      priority: 1,
      fallbackColor: "rgb(175, 175, 175)"
    },
    mode_change: {
      label: "SYSTEM",
      priority: 1,
      fallbackColor: "rgb(194, 194, 194)"
    }
  };

  const state = {
    config: normalizeConfig(null),
    isActive: false,
    overlayUI: {
      root: null,
      lane: null,
      host: null,
      hostOriginalPosition: null,
      dragHandle: null,
      dragFrame: null
    },
    chatSourceObserver: null,
    pageObserver: null,
    renderQueue: [],
    removeQueue: [],
    activeTimers: new Map(),
    messageNodes: new Map(),
    messageOrder: [],
    messageHistoryOrder: [],
    messageHistoryMap: new Map(),
    seenMessageIds: new Set(),
    seenIdOrder: [],
    chatVisibilityBackup: null,
    currentChatIframe: null,
    currentChatItemsNode: null,
    chatSourceRetryTimer: 0,
    hiddenChatIframe: null,
    hiddenChatVideoId: "",
    hiddenChatEndpointIndex: 0,
    hiddenChatCreatedAt: 0,
    hiddenChatLoadPending: false,
    expiredMessageIds: [],
    expiredMessageIdSet: new Set(),
    expireDrainTimer: 0,
    configSaveTimer: 0,
    dragState: {
      active: false,
      pointerId: null,
      mode: "fullscreen",
      startClientX: 0,
      startClientY: 0,
      startOffsetXPx: 0,
      startOffsetYPx: 0
    },
    flushRaf: 0,
    syncRaf: 0
  };

  function clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    if (numeric < min) {
      return min;
    }
    if (numeric > max) {
      return max;
    }
    return numeric;
  }

  function normalizeModeProfile(rawProfile, fallbackProfile) {
    const input = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
    const fallback =
      fallbackProfile && typeof fallbackProfile === "object"
        ? fallbackProfile
        : DEFAULT_MODE_PROFILE;
    const horizontalAlign =
      input.horizontalAlign === "right"
        ? "right"
        : input.horizontalAlign === "left"
          ? "left"
          : fallback.horizontalAlign;
    const verticalAlign =
      input.verticalAlign === "top"
        ? "top"
        : input.verticalAlign === "bottom"
          ? "bottom"
          : fallback.verticalAlign;
    const offsetXInput =
      typeof input.offsetXPx !== "undefined" ? input.offsetXPx : input.leftOffsetPx;
    const offsetYInput =
      typeof input.offsetYPx !== "undefined" ? input.offsetYPx : input.bottomOffsetPx;

    return {
      maxVisible: Math.round(
        clampNumber(input.maxVisible, 1, 20, fallback.maxVisible)
      ),
      ttlMs: Math.round(clampNumber(input.ttlMs, 1000, 30000, fallback.ttlMs)),
      fadeMs: Math.round(clampNumber(input.fadeMs, 0, 2000, fallback.fadeMs)),
      sequentialFadeSec: clampNumber(
        input.sequentialFadeSec,
        0,
        10,
        fallback.sequentialFadeSec
      ),
      laneWidthPercent: Math.round(
        clampNumber(input.laneWidthPercent, 20, 80, fallback.laneWidthPercent)
      ),
      fontSizePx: Math.round(
        clampNumber(input.fontSizePx, 12, 64, fallback.fontSizePx)
      ),
      fontWeight: Math.round(
        clampNumber(input.fontWeight, 100, 900, fallback.fontWeight)
      ),
      avatarSizePx: Math.round(
        clampNumber(input.avatarSizePx, 24, 96, fallback.avatarSizePx)
      ),
      rowGapPx: Math.round(clampNumber(input.rowGapPx, 0, 24, fallback.rowGapPx)),
      horizontalAlign,
      verticalAlign,
      offsetXPx: Math.round(
        clampNumber(offsetXInput, 0, OFFSET_MAX_X_BASE, fallback.offsetXPx)
      ),
      offsetYPx: Math.round(
        clampNumber(offsetYInput, 0, OFFSET_MAX_Y_BASE, fallback.offsetYPx)
      ),
      strokePx: clampNumber(input.strokePx, 0, 4, fallback.strokePx),
      textOpacity: clampNumber(input.textOpacity, 0.1, 1, fallback.textOpacity),
      messageBgOpacity: clampNumber(
        input.messageBgOpacity,
        0,
        0.9,
        fallback.messageBgOpacity
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
    const s = clampNumber(scale, 0.4, 2.5, 1);
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

  function normalizeConfig(rawConfig) {
    const input = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
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
      fullscreen: clampNumber(modeSizeScaleInput.fullscreen, 0.4, 2.5, 1),
      theater: clampNumber(modeSizeScaleInput.theater, 0.4, 2.5, 1),
      normal: clampNumber(modeSizeScaleInput.normal, 0.4, 2.5, 1)
    };

    /** @type {{fullscreen: OverlayModeProfile, theater: OverlayModeProfile, normal: OverlayModeProfile}} */
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
            : DEFAULT_CONFIG.enabledModes.fullscreen,
        theater:
          typeof modeInput.theater === "boolean"
            ? modeInput.theater
            : DEFAULT_CONFIG.enabledModes.theater,
        normal:
          typeof modeInput.normal === "boolean"
            ? modeInput.normal
            : DEFAULT_CONFIG.enabledModes.normal
      },
      modeProfiles,
      // Kept for backward compatibility with older code paths.
      maxVisible: modeProfiles.fullscreen.maxVisible,
      ttlMs: modeProfiles.fullscreen.ttlMs,
      fadeMs: modeProfiles.fullscreen.fadeMs,
      sequentialFadeSec: modeProfiles.fullscreen.sequentialFadeSec,
      laneWidthPercent: modeProfiles.fullscreen.laneWidthPercent,
      fontSizePx: modeProfiles.fullscreen.fontSizePx,
      fontWeight: modeProfiles.fullscreen.fontWeight,
      avatarSizePx: modeProfiles.fullscreen.avatarSizePx,
      rowGapPx: modeProfiles.fullscreen.rowGapPx,
      horizontalAlign: modeProfiles.fullscreen.horizontalAlign,
      verticalAlign: modeProfiles.fullscreen.verticalAlign,
      offsetXPx: modeProfiles.fullscreen.offsetXPx,
      offsetYPx: modeProfiles.fullscreen.offsetYPx,
      strokePx: modeProfiles.fullscreen.strokePx,
      textOpacity: modeProfiles.fullscreen.textOpacity,
      messageBgOpacity: modeProfiles.fullscreen.messageBgOpacity,
      showAvatar: modeProfiles.fullscreen.showAvatar,
      showAuthorName: modeProfiles.fullscreen.showAuthorName
    };
  }

  function getStorageArea() {
    if (typeof chrome === "undefined") {
      return null;
    }
    if (!chrome.storage || !chrome.storage.local) {
      return null;
    }
    return chrome.storage.local;
  }

  function queueConfigSave(delayMs) {
    const storage = getStorageArea();
    if (!storage) {
      return;
    }

    if (state.configSaveTimer) {
      window.clearTimeout(state.configSaveTimer);
      state.configSaveTimer = 0;
    }

    const delay = typeof delayMs === "number" ? Math.max(0, delayMs) : 80;
    state.configSaveTimer = window.setTimeout(() => {
      state.configSaveTimer = 0;
      storage.set({ [STORAGE_KEY]: state.config }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          // Ignore storage write failures; overlay can keep running with in-memory state.
        }
      });
    }, delay);
  }

  function loadConfigFromStorage() {
    const storage = getStorageArea();
    if (!storage) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      storage.get([STORAGE_KEY], (result) => {
        state.config = normalizeConfig(result ? result[STORAGE_KEY] : null);
        resolve();
      });
    });
  }

  function applyConfigChange() {
    applyOverlayLayoutStyles();
    updateExistingRowStyles();

    if (state.isActive) {
      enforceMaxVisible();
      if (state.dragState.active) {
        revealHistoryDuringDrag();
      }
    }

    scheduleSync();
  }

  function watchStorageChanges() {
    if (typeof chrome === "undefined") {
      return;
    }
    if (!chrome.storage || !chrome.storage.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
        return;
      }

      const change = changes[STORAGE_KEY];
      state.config = normalizeConfig(change ? change.newValue : null);
      applyConfigChange();
    });
  }

  function getFullscreenApiElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function getFullscreenPlayerElement() {
    return (
      document.querySelector("#movie_player.ytp-fullscreen") ||
      document.querySelector(".html5-video-player.ytp-fullscreen") ||
      document.querySelector("ytd-player.ytp-fullscreen") ||
      document.querySelector("ytd-watch-flexy[fullscreen] #movie_player") ||
      document.querySelector("ytd-watch-flexy[fullscreen] .html5-video-player") ||
      document.querySelector(".ytp-fullscreen") ||
      null
    );
  }

  function isFullscreenActive() {
    return Boolean(getFullscreenApiElement() || getFullscreenPlayerElement());
  }

  function isTheaterActive() {
    const watchFlexy = document.querySelector("ytd-watch-flexy");
    if (!watchFlexy) {
      return false;
    }
    const theaterValue = watchFlexy.getAttribute("theater");
    if (theaterValue === null) {
      return false;
    }
    return theaterValue === "" || theaterValue === "true" || theaterValue === "1";
  }

  function shouldHideNativeChat() {
    return false;
  }

  function isWatchPageActive() {
    if (document.querySelector("ytd-watch-flexy")) {
      return true;
    }
    return location.pathname === "/watch" || location.pathname.startsWith("/live/");
  }

  function shouldEnableOverlay() {
    const { enabledModes } = state.config;
    return (
      (enabledModes.fullscreen && isFullscreenActive()) ||
      (enabledModes.theater && isTheaterActive()) ||
      (enabledModes.normal && isWatchPageActive())
    );
  }

  function getCurrentDisplayMode() {
    if (isFullscreenActive()) {
      return "fullscreen";
    }
    if (isTheaterActive()) {
      return "theater";
    }
    return "normal";
  }

  function getCurrentModeProfile() {
    const mode = getCurrentDisplayMode();
    const modeProfiles =
      state.config && state.config.modeProfiles ? state.config.modeProfiles : null;
    if (modeProfiles && modeProfiles[mode]) {
      return modeProfiles[mode];
    }
    return DEFAULT_CONFIG.modeProfiles[mode];
  }

  function resolveFullscreenHost(fullscreenElement) {
    if (!(fullscreenElement instanceof Element)) {
      return null;
    }

    const descendant = fullscreenElement.querySelector(
      "#movie_player, .html5-video-player, ytd-player, #player"
    );
    if (descendant) {
      return descendant;
    }

    const preferred = fullscreenElement.closest(
      "#movie_player, .html5-video-player, ytd-player, #player"
    );
    if (preferred) {
      return preferred;
    }

    if (fullscreenElement.tagName.toLowerCase() === "video") {
      return fullscreenElement.parentElement || fullscreenElement;
    }

    return fullscreenElement;
  }

  function getPlayerHost() {
    const fullscreenElement = getFullscreenApiElement();
    if (fullscreenElement) {
      const resolvedHost = resolveFullscreenHost(fullscreenElement);
      if (resolvedHost) {
        return resolvedHost;
      }
    }

    const fullscreenPlayer = getFullscreenPlayerElement();
    if (fullscreenPlayer) {
      return fullscreenPlayer;
    }

    const candidates = [
      "#movie_player",
      ".html5-video-player",
      "ytd-player",
      "#player"
    ];

    for (const selector of candidates) {
      const node = document.querySelector(selector);
      if (node) {
        return node;
      }
    }

    return null;
  }

  function getScaledOffsetPx(offsetPx, axis) {
    const host = state.overlayUI.host;
    if (!host) {
      return Math.max(0, Math.round(offsetPx));
    }

    const rect = host.getBoundingClientRect();
    const hostSize = axis === "y" ? rect.height : rect.width;
    const baseSize = axis === "y" ? 1080 : 1920;
    if (!Number.isFinite(hostSize) || hostSize <= 0) {
      return Math.max(0, Math.round(offsetPx));
    }

    const scaled = (Number(offsetPx) * hostSize) / baseSize;
    return Math.max(0, Math.round(scaled));
  }

  function getDragGuideSize(profile) {
    const host = state.overlayUI.host;
    const lane = state.overlayUI.lane;
    if (!host) {
      return null;
    }

    const hostRect = host.getBoundingClientRect();
    if (!Number.isFinite(hostRect.width) || !Number.isFinite(hostRect.height)) {
      return null;
    }
    if (hostRect.width <= 0 || hostRect.height <= 0) {
      return null;
    }

    const laneRect = lane ? lane.getBoundingClientRect() : null;
    const fallbackWidth = Math.max(
      40,
      Math.min((hostRect.width * profile.laneWidthPercent) / 100, hostRect.width * 0.96)
    );
    const rowGapPx = Math.max(0, Math.round(profile.rowGapPx));
    const rowPaddingY = Math.max(2, Math.round(profile.fontSizePx * 0.12));
    const rowCoreHeight = Math.max(
      Math.round(profile.fontSizePx * 1.1),
      profile.showAvatar ? profile.avatarSizePx : 0
    );
    const estimatedRowHeight = Math.max(24, rowCoreHeight + rowPaddingY * 2);
    const estimatedRowsHeight =
      estimatedRowHeight * Math.max(1, profile.maxVisible) +
      rowGapPx * Math.max(0, profile.maxVisible - 1);
    const fallbackHeight = Math.max(96, estimatedRowsHeight + 18);

    let width =
      laneRect && Number.isFinite(laneRect.width) && laneRect.width > 0
        ? laneRect.width
        : fallbackWidth;
    width = Math.max(40, Math.min(width, hostRect.width));

    let height =
      laneRect && Number.isFinite(laneRect.height) && laneRect.height > 0
        ? laneRect.height + 18
        : fallbackHeight;
    height = Math.min(hostRect.height, Math.max(fallbackHeight, height));

    return {
      hostRect,
      width,
      height
    };
  }

  function toBaseOffsetLimit(hostSizePx, guideSizePx, baseSize, absoluteMax) {
    if (!Number.isFinite(hostSizePx) || hostSizePx <= 0) {
      return absoluteMax;
    }

    const remainingPx = Math.max(0, hostSizePx - guideSizePx);
    const maxBase = (remainingPx * baseSize) / hostSizePx;
    return Math.round(clampNumber(maxBase, 0, absoluteMax, 0));
  }

  function getProfileOffsetBounds(profile) {
    const size = getDragGuideSize(profile);
    if (!size) {
      return {
        offsetXBase: Math.round(
          clampNumber(profile.offsetXPx, 0, OFFSET_MAX_X_BASE, profile.offsetXPx)
        ),
        offsetYBase: Math.round(
          clampNumber(profile.offsetYPx, 0, OFFSET_MAX_Y_BASE, profile.offsetYPx)
        ),
        maxXBase: OFFSET_MAX_X_BASE,
        maxYBase: OFFSET_MAX_Y_BASE,
        size: null
      };
    }

    const maxXBase = toBaseOffsetLimit(
      size.hostRect.width,
      size.width,
      1920,
      OFFSET_MAX_X_BASE
    );
    const maxYBase = toBaseOffsetLimit(
      size.hostRect.height,
      size.height,
      1080,
      OFFSET_MAX_Y_BASE
    );

    return {
      offsetXBase: Math.round(clampNumber(profile.offsetXPx, 0, maxXBase, profile.offsetXPx)),
      offsetYBase: Math.round(clampNumber(profile.offsetYPx, 0, maxYBase, profile.offsetYPx)),
      maxXBase,
      maxYBase,
      size
    };
  }

  function getDragGuideRect() {
    const profile = getCurrentModeProfile();
    const bounds = getProfileOffsetBounds(profile);
    if (!bounds.size) {
      return null;
    }

    const { hostRect, width, height } = bounds.size;
    const scaledOffsetXPx = getScaledOffsetPx(bounds.offsetXBase, "x");
    const scaledOffsetYPx = getScaledOffsetPx(bounds.offsetYBase, "y");

    let left =
      profile.horizontalAlign === "right"
        ? hostRect.width - scaledOffsetXPx - width
        : scaledOffsetXPx;
    let top =
      profile.verticalAlign === "top"
        ? scaledOffsetYPx
        : hostRect.height - scaledOffsetYPx - height;

    left = Math.min(Math.max(0, left), Math.max(0, hostRect.width - width));
    top = Math.min(Math.max(0, top), Math.max(0, hostRect.height - height));

    return { left, top, width, height };
  }

  function syncDragOverlayLayout() {
    const rect = getDragGuideRect();
    if (!rect) {
      return;
    }

    const handle = state.overlayUI.dragHandle;
    const frame = state.overlayUI.dragFrame;
    if (handle) {
      handle.style.left = `${Math.round(rect.left)}px`;
      handle.style.top = `${Math.round(rect.top)}px`;
      handle.style.width = `${Math.round(rect.width)}px`;
      handle.style.height = `${Math.round(rect.height)}px`;
    }
    if (frame) {
      frame.style.left = `${Math.round(rect.left)}px`;
      frame.style.top = `${Math.round(rect.top)}px`;
      frame.style.width = `${Math.round(rect.width)}px`;
      frame.style.height = `${Math.round(rect.height)}px`;
    }
  }

  function endOffsetDrag() {
    const drag = state.dragState;
    if (!drag.active) {
      return;
    }

    const handle = state.overlayUI.dragHandle;
    if (handle && typeof drag.pointerId === "number") {
      try {
        if (handle.hasPointerCapture(drag.pointerId)) {
          handle.releasePointerCapture(drag.pointerId);
        }
      } catch (_error) {
        // Ignore pointer capture errors caused by host/UI changes mid-drag.
      }
    }

    drag.active = false;
    drag.pointerId = null;
    if (handle) {
      handle.style.cursor = "grab";
    }
    if (state.overlayUI.dragFrame) {
      state.overlayUI.dragFrame.style.display = "none";
    }

    for (const row of state.messageNodes.values()) {
      if (row && row.dataset) {
        delete row.dataset.dragPinned;
      }
    }
    triggerSequentialFadeOutForVisibleMessages();
    applyOverlayLayoutStyles();
    queueConfigSave(0);
  }

  function onDragHandlePointerDown(event) {
    if (!state.isActive) {
      return;
    }
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (event.button !== 0) {
      return;
    }

    const mode = getCurrentDisplayMode();
    const profiles = state.config.modeProfiles;
    const profile = profiles ? profiles[mode] : null;
    if (!profile) {
      return;
    }

    state.dragState.active = true;
    state.dragState.pointerId = event.pointerId;
    state.dragState.mode = mode;
    state.dragState.startClientX = event.clientX;
    state.dragState.startClientY = event.clientY;
    state.dragState.startOffsetXPx = profile.offsetXPx;
    state.dragState.startOffsetYPx = profile.offsetYPx;

    const handle = state.overlayUI.dragHandle;
    if (handle) {
      try {
        handle.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Ignore pointer capture failures.
      }
      handle.style.cursor = "grabbing";
    }

    if (state.overlayUI.dragFrame) {
      state.overlayUI.dragFrame.style.display = "block";
    }
    revealHistoryDuringDrag();
    syncDragOverlayLayout();
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragHandlePointerMove(event) {
    const drag = state.dragState;
    if (!drag.active) {
      return;
    }
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (event.pointerId !== drag.pointerId) {
      return;
    }

    const host = state.overlayUI.host;
    const profiles = state.config.modeProfiles;
    const profile = profiles ? profiles[drag.mode] : null;
    if (!host || !profile) {
      return;
    }

    const hostRect = host.getBoundingClientRect();
    if (hostRect.width <= 0 || hostRect.height <= 0) {
      return;
    }

    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    const baseDeltaX = (deltaX * 1920) / hostRect.width;
    const baseDeltaY = (deltaY * 1080) / hostRect.height;

    const nextOffsetX =
      drag.startOffsetXPx +
      (profile.horizontalAlign === "left" ? baseDeltaX : -baseDeltaX);
    const nextOffsetY =
      drag.startOffsetYPx +
      (profile.verticalAlign === "top" ? baseDeltaY : -baseDeltaY);

    const bounds = getProfileOffsetBounds(profile);
    profile.offsetXPx = Math.round(
      clampNumber(nextOffsetX, 0, bounds.maxXBase, bounds.offsetXBase)
    );
    profile.offsetYPx = Math.round(
      clampNumber(nextOffsetY, 0, bounds.maxYBase, bounds.offsetYBase)
    );

    applyOverlayLayoutStyles();
    queueConfigSave(80);
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragHandlePointerUp(event) {
    const drag = state.dragState;
    if (!drag.active) {
      return;
    }
    if (event instanceof PointerEvent && event.pointerId !== drag.pointerId) {
      return;
    }

    endOffsetDrag();
    if (event instanceof Event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function applyOverlayLayoutStyles() {
    const lane = state.overlayUI.lane;
    if (!lane) {
      return;
    }

    const profile = getCurrentModeProfile();
    const bounds = getProfileOffsetBounds(profile);
    const offsetXPx = getScaledOffsetPx(bounds.offsetXBase, "x");
    const offsetYPx = getScaledOffsetPx(bounds.offsetYBase, "y");
    lane.style.left = "";
    lane.style.right = "";
    lane.style.top = "";
    lane.style.bottom = "";

    if (profile.horizontalAlign === "right") {
      lane.style.right = `max(${offsetXPx}px, env(safe-area-inset-right))`;
    } else {
      lane.style.left = `max(${offsetXPx}px, env(safe-area-inset-left))`;
    }

    if (profile.verticalAlign === "top") {
      lane.style.top = `max(${offsetYPx}px, env(safe-area-inset-top))`;
    } else {
      lane.style.bottom = `max(${offsetYPx}px, env(safe-area-inset-bottom))`;
    }
    lane.style.width = `${profile.laneWidthPercent}%`;
    lane.style.maxWidth = "96%";
    lane.style.gap = `${Math.max(0, Math.round(profile.rowGapPx))}px`;
    syncDragOverlayLayout();
  }

  function ensureOverlayUI() {
    const host = getPlayerHost();
    if (!host) {
      return;
    }

    let root = state.overlayUI.root;
    let lane = state.overlayUI.lane;
    let dragHandle = state.overlayUI.dragHandle;
    let dragFrame = state.overlayUI.dragFrame;

    if (!root) {
      root = document.createElement("div");
      root.id = OVERLAY_ROOT_ID;
      root.style.position = "absolute";
      root.style.inset = "0";
      root.style.pointerEvents = "none";
      root.style.zIndex = "2147483647";
      root.style.overflow = "hidden";

      lane = document.createElement("div");
      lane.id = OVERLAY_LANE_ID;
      lane.style.position = "absolute";
      lane.style.display = "flex";
      lane.style.flexDirection = "column";
      lane.style.alignItems = "stretch";
      lane.style.pointerEvents = "none";

      root.appendChild(lane);

      dragHandle = document.createElement("div");
      dragHandle.id = "yt-chat-overlay-drag-handle";
      dragHandle.style.position = "absolute";
      dragHandle.style.pointerEvents = "auto";
      dragHandle.style.background = "rgba(0, 0, 0, 0.001)";
      dragHandle.style.cursor = "grab";
      dragHandle.style.touchAction = "none";
      dragHandle.style.zIndex = "2147483646";
      dragHandle.style.borderRadius = "10px";
      dragHandle.style.userSelect = "none";
      dragHandle.addEventListener("pointerdown", onDragHandlePointerDown);
      dragHandle.addEventListener("pointermove", onDragHandlePointerMove);
      dragHandle.addEventListener("pointerup", onDragHandlePointerUp);
      dragHandle.addEventListener("pointercancel", onDragHandlePointerUp);
      dragHandle.addEventListener("dragstart", (event) => event.preventDefault());

      dragFrame = document.createElement("div");
      dragFrame.id = "yt-chat-overlay-drag-frame";
      dragFrame.style.position = "absolute";
      dragFrame.style.pointerEvents = "none";
      dragFrame.style.display = "none";
      dragFrame.style.zIndex = "2147483647";
      dragFrame.style.border = "2px dashed rgba(255, 255, 255, 0.95)";
      dragFrame.style.borderRadius = "10px";
      dragFrame.style.boxShadow = "0 0 0 1px rgba(0, 0, 0, 0.85), 0 0 22px rgba(0, 0, 0, 0.45)";
      dragFrame.style.background = "rgba(255, 255, 255, 0.04)";
    }

    if (state.overlayUI.host !== host) {
      if (state.overlayUI.host && root.parentNode === state.overlayUI.host) {
        state.overlayUI.host.removeChild(root);
      }
      if (state.overlayUI.host && dragHandle && dragHandle.parentNode === state.overlayUI.host) {
        state.overlayUI.host.removeChild(dragHandle);
      }
      if (state.overlayUI.host && dragFrame && dragFrame.parentNode === state.overlayUI.host) {
        state.overlayUI.host.removeChild(dragFrame);
      }

      if (state.overlayUI.host && state.overlayUI.hostOriginalPosition !== null) {
        state.overlayUI.host.style.position = state.overlayUI.hostOriginalPosition;
      }

      const hostStyle = window.getComputedStyle(host);
      if (hostStyle.position === "static") {
        state.overlayUI.hostOriginalPosition = host.style.position || "";
        host.style.position = "relative";
      } else {
        state.overlayUI.hostOriginalPosition = null;
      }

      host.appendChild(root);
      if (dragHandle) {
        host.appendChild(dragHandle);
      }
      if (dragFrame) {
        host.appendChild(dragFrame);
      }
      state.overlayUI.host = host;
    } else if (root.parentNode !== host) {
      host.appendChild(root);
      if (dragHandle && dragHandle.parentNode !== host) {
        host.appendChild(dragHandle);
      }
      if (dragFrame && dragFrame.parentNode !== host) {
        host.appendChild(dragFrame);
      }
    }

    state.overlayUI.root = root;
    state.overlayUI.lane = lane;
    state.overlayUI.dragHandle = dragHandle;
    state.overlayUI.dragFrame = dragFrame;
    applyOverlayLayoutStyles();
  }

  function removeOverlayUI() {
    endOffsetDrag();

    const { root, host, hostOriginalPosition, dragHandle, dragFrame } = state.overlayUI;
    if (root && host && root.parentNode === host) {
      host.removeChild(root);
    }
    if (dragHandle && host && dragHandle.parentNode === host) {
      host.removeChild(dragHandle);
    }
    if (dragFrame && host && dragFrame.parentNode === host) {
      host.removeChild(dragFrame);
    }
    if (host && hostOriginalPosition !== null) {
      host.style.position = hostOriginalPosition;
    }

    state.overlayUI.root = null;
    state.overlayUI.lane = null;
    state.overlayUI.dragHandle = null;
    state.overlayUI.dragFrame = null;
    state.overlayUI.host = null;
    state.overlayUI.hostOriginalPosition = null;
  }

  function findChatContainer() {
    const candidates = [
      "ytd-live-chat-frame#chat",
      "#chat.ytd-watch-flexy",
      "ytd-live-chat-frame"
    ];

    for (const selector of candidates) {
      const node = document.querySelector(selector);
      if (node) {
        return node;
      }
    }

    return null;
  }

  function hideNativeChat() {
    const node = findChatContainer();
    if (!node) {
      return;
    }

    if (state.chatVisibilityBackup && state.chatVisibilityBackup.node === node) {
      return;
    }

    if (state.chatVisibilityBackup && state.chatVisibilityBackup.node !== node) {
      restoreNativeChat();
    }

    state.chatVisibilityBackup = {
      node,
      style: node.getAttribute("style"),
      ariaHidden: node.getAttribute("aria-hidden")
    };

    node.style.position = "fixed";
    node.style.left = "-200vw";
    node.style.top = "-200vh";
    node.style.width = "1px";
    node.style.height = "1px";
    node.style.maxWidth = "1px";
    node.style.maxHeight = "1px";
    node.style.opacity = "0";
    node.style.pointerEvents = "none";
    node.style.overflow = "hidden";
    node.style.transform = "translate3d(0,0,0)";
    node.setAttribute("aria-hidden", "true");
  }

  function restoreNativeChat() {
    const backup = state.chatVisibilityBackup;
    if (!backup || !backup.node) {
      return;
    }

    if (backup.style === null) {
      backup.node.removeAttribute("style");
    } else {
      backup.node.setAttribute("style", backup.style);
    }

    if (backup.ariaHidden === null) {
      backup.node.removeAttribute("aria-hidden");
    } else {
      backup.node.setAttribute("aria-hidden", backup.ariaHidden);
    }

    state.chatVisibilityBackup = null;
  }

  function findChatIframe() {
    return document.querySelector("ytd-live-chat-frame iframe");
  }

  function getCurrentVideoId() {
    const params = new URLSearchParams(location.search);
    const id = params.get("v");
    if (id && id.trim()) {
      return id.trim();
    }

    const watchFlexyId =
      document.querySelector("ytd-watch-flexy")?.getAttribute("video-id") || "";
    if (watchFlexyId.trim()) {
      return watchFlexyId.trim();
    }

    const itemPropId =
      document.querySelector('meta[itemprop="videoId"]')?.getAttribute("content") || "";
    if (itemPropId.trim()) {
      return itemPropId.trim();
    }

    const canonicalHref =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
    if (canonicalHref) {
      try {
        const canonicalUrl = new URL(canonicalHref, location.origin);
        const canonicalId = canonicalUrl.searchParams.get("v");
        if (canonicalId && canonicalId.trim()) {
          return canonicalId.trim();
        }
      } catch (_error) {
        // Ignore malformed canonical URL.
      }
    }

    const liveMatch = location.pathname.match(/^\/live\/([A-Za-z0-9_-]{6,})/);
    if (liveMatch && liveMatch[1]) {
      return liveMatch[1];
    }

    return "";
  }

  function getHiddenChatUrls(videoId) {
    if (!videoId) {
      return [];
    }
    return [
      `https://www.youtube.com/live_chat?v=${videoId}&is_popout=1`,
      `https://www.youtube.com/live_chat_replay?v=${videoId}&is_popout=1`
    ];
  }

  function removeHiddenChatIframe() {
    if (state.hiddenChatIframe && state.hiddenChatIframe.parentNode) {
      state.hiddenChatIframe.parentNode.removeChild(state.hiddenChatIframe);
    }

    state.hiddenChatIframe = null;
    state.hiddenChatVideoId = "";
    state.hiddenChatEndpointIndex = 0;
    state.hiddenChatCreatedAt = 0;
    state.hiddenChatLoadPending = false;
  }

  function ensureHiddenChatIframe() {
    const videoId = getCurrentVideoId();
    if (!videoId) {
      removeHiddenChatIframe();
      return null;
    }

    const urls = getHiddenChatUrls(videoId);
    if (urls.length === 0) {
      return null;
    }

    if (state.hiddenChatIframe && state.hiddenChatVideoId === videoId) {
      return state.hiddenChatIframe;
    }

    removeHiddenChatIframe();

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-200vw";
    iframe.style.top = "-200vh";
    iframe.style.width = "2px";
    iframe.style.height = "2px";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "0";
    iframe.style.zIndex = "-1";
    iframe.setAttribute("aria-hidden", "true");

    state.hiddenChatIframe = iframe;
    state.hiddenChatVideoId = videoId;
    state.hiddenChatEndpointIndex = 0;
    state.hiddenChatCreatedAt = Date.now();
    state.hiddenChatLoadPending = true;

    iframe.addEventListener("load", () => {
      state.hiddenChatLoadPending = false;
      scheduleSync();
    });

    iframe.src = urls[0];
    document.documentElement.appendChild(iframe);
    return iframe;
  }

  function maybeSwitchHiddenChatEndpoint() {
    const iframe = state.hiddenChatIframe;
    if (!iframe || state.hiddenChatLoadPending) {
      return;
    }

    const urls = getHiddenChatUrls(state.hiddenChatVideoId);
    if (urls.length < 2) {
      return;
    }

    if (state.hiddenChatEndpointIndex >= urls.length - 1) {
      return;
    }

    if (Date.now() - state.hiddenChatCreatedAt < 2500) {
      return;
    }

    state.hiddenChatEndpointIndex += 1;
    state.hiddenChatLoadPending = true;
    iframe.src = urls[state.hiddenChatEndpointIndex];
  }

  function disconnectChatSource() {
    if (state.chatSourceRetryTimer) {
      window.clearTimeout(state.chatSourceRetryTimer);
      state.chatSourceRetryTimer = 0;
    }
    if (state.chatSourceObserver) {
      state.chatSourceObserver.disconnect();
      state.chatSourceObserver = null;
    }
    state.currentChatIframe = null;
    state.currentChatItemsNode = null;
  }

  function scheduleChatSourceRetry(delayMs) {
    if (!state.isActive || state.chatSourceRetryTimer) {
      return;
    }

    const delay = typeof delayMs === "number" ? delayMs : 500;
    state.chatSourceRetryTimer = window.setTimeout(() => {
      state.chatSourceRetryTimer = 0;
      scheduleSync();
    }, delay);
  }

  function getChatItemsNode(iframe) {
    if (!iframe) {
      return null;
    }

    try {
      const chatDoc =
        iframe.contentDocument ||
        (iframe.contentWindow ? iframe.contentWindow.document : null);
      if (!chatDoc) {
        return null;
      }

      return chatDoc.querySelector("yt-live-chat-item-list-renderer #items, #items");
    } catch (_error) {
      return null;
    }
  }

  function connectChatSource() {
    const nativeIframe = findChatIframe();
    const nativeItemsNode = getChatItemsNode(nativeIframe);

    let iframe = nativeIframe;
    let itemsNode = nativeItemsNode;
    let usesHiddenSource = false;

    // If native chat panel is closed, iframe may exist but items are unavailable.
    // In that case, fall back to an off-screen chat iframe.
    if (!itemsNode) {
      const hiddenIframe = ensureHiddenChatIframe();
      const hiddenItemsNode = getChatItemsNode(hiddenIframe);
      if (hiddenIframe) {
        iframe = hiddenIframe;
        itemsNode = hiddenItemsNode;
        usesHiddenSource = true;
      }
    } else if (state.hiddenChatIframe) {
      removeHiddenChatIframe();
    }

    if (!iframe) {
      disconnectChatSource();
      scheduleChatSourceRetry(500);
      return;
    }

    if (!itemsNode) {
      if (usesHiddenSource) {
        maybeSwitchHiddenChatEndpoint();
      }
      if (state.chatSourceObserver) {
        disconnectChatSource();
      }

      if (state.currentChatIframe !== iframe) {
        state.currentChatIframe = iframe;
        iframe.addEventListener("load", scheduleSync, { once: true });
      }
      scheduleChatSourceRetry(500);
      return;
    }

    if (state.chatSourceRetryTimer) {
      window.clearTimeout(state.chatSourceRetryTimer);
      state.chatSourceRetryTimer = 0;
    }

    if (
      state.currentChatIframe === iframe &&
      state.currentChatItemsNode === itemsNode &&
      state.chatSourceObserver
    ) {
      return;
    }

    disconnectChatSource();
    state.currentChatIframe = iframe;
    state.currentChatItemsNode = itemsNode;
    state.chatSourceObserver = new MutationObserver(onChatMutations);
    state.chatSourceObserver.observe(itemsNode, {
      childList: true,
      subtree: true
    });

    ingestExistingMessages(itemsNode);
  }

  function onChatMutations(mutations) {
    const renderers = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        collectRendererElements(node, renderers);
      }
    }

    if (!renderers.length) {
      return;
    }

    for (const renderer of renderers) {
      const message = parseRendererMessage(renderer);
      if (message) {
        enqueueMessage(message);
      }
    }
  }

  function collectRendererElements(node, output) {
    if (!(node instanceof Element)) {
      return;
    }

    const added = [];
    if (node.matches(RENDERER_SELECTOR)) {
      added.push(node);
    }

    for (const child of node.querySelectorAll(RENDERER_SELECTOR)) {
      added.push(child);
    }

    for (const element of added) {
      if (!output.includes(element)) {
        output.push(element);
      }
    }
  }

  function ingestExistingMessages(itemsNode) {
    const existing = Array.from(itemsNode.querySelectorAll(RENDERER_SELECTOR));
    const profile = getCurrentModeProfile();
    const startIndex = Math.max(0, existing.length - profile.maxVisible);
    for (let i = startIndex; i < existing.length; i += 1) {
      const message = parseRendererMessage(existing[i]);
      if (message) {
        enqueueMessage(message);
      }
    }
  }

  function mapRendererType(renderer) {
    const tag = renderer.tagName.toLowerCase();
    switch (tag) {
      case "yt-live-chat-text-message-renderer":
        return "text";
      case "yt-live-chat-paid-message-renderer":
        return "paid";
      case "yt-live-chat-membership-item-renderer":
        return "membership";
      case "yt-live-chat-paid-sticker-renderer":
        return "sticker";
      case "yt-live-chat-viewer-engagement-message-renderer":
        return "engagement";
      case "yt-live-chat-mode-change-message-renderer":
        return "mode_change";
      default:
        return "";
    }
  }

  function getImageSource(image) {
    if (!image) {
      return "";
    }

    const normalizeUrl = (value) => {
      const raw = String(value || "").trim();
      if (!raw) {
        return "";
      }
      if (
        raw.startsWith("http://") ||
        raw.startsWith("https://") ||
        raw.startsWith("data:") ||
        raw.startsWith("blob:")
      ) {
        return raw;
      }
      if (raw.startsWith("//")) {
        return `${location.protocol}${raw}`;
      }
      try {
        return new URL(raw, location.origin).toString();
      } catch (_error) {
        return raw;
      }
    };

    const extractSrcsetUrl = (srcsetValue) => {
      const srcset = String(srcsetValue || "").trim();
      if (!srcset) {
        return "";
      }

      const parts = srcset.split(",");
      for (const part of parts) {
        const candidate = part.trim().split(/\s+/)[0];
        const normalized = normalizeUrl(candidate);
        if (normalized) {
          return normalized;
        }
      }
      return "";
    };

    const candidates = [
      image.currentSrc,
      image.src,
      image.getAttribute("src"),
      extractSrcsetUrl(image.srcset),
      extractSrcsetUrl(image.getAttribute("srcset")),
      image.getAttribute("data-thumb"),
      image.getAttribute("data-ytimg"),
      image.getAttribute("data-src"),
      image.getAttribute("data-lazy-src"),
      image.getAttribute("data-image-src")
    ];

    for (const candidate of candidates) {
      const normalized = normalizeUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return "";
  }

  function extractCssUrl(value) {
    const input = String(value || "");
    const match = input.match(/url\((['"]?)(.*?)\1\)/i);
    if (!match || !match[2]) {
      return "";
    }
    return match[2];
  }

  function getEmojiElementBackgroundSource(element) {
    if (!(element instanceof Element)) {
      return "";
    }

    const tag = element.tagName.toLowerCase();
    const className =
      typeof element.className === "string" ? element.className.toLowerCase() : "";
    const role = (element.getAttribute("role") || "").toLowerCase();
    const isEmojiLike =
      role === "img" ||
      tag.includes("emoji") ||
      className.includes("emoji") ||
      className.includes("emote");

    if (!isEmojiLike) {
      return "";
    }

    const inlineStyleUrl = extractCssUrl(element.getAttribute("style"));
    if (inlineStyleUrl) {
      return inlineStyleUrl;
    }

    try {
      const computed = window.getComputedStyle(element);
      const computedUrl = extractCssUrl(computed ? computed.backgroundImage : "");
      if (computedUrl) {
        return computedUrl;
      }
    } catch (_error) {
      // Ignore style access errors.
    }

    return "";
  }

  function extractText(element) {
    if (!element) {
      return "";
    }

    const raw = (element.innerText || element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    if (raw) {
      return raw;
    }

    const emoji = Array.from(element.querySelectorAll("img[alt]"))
      .map((img) => img.getAttribute("alt") || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return emoji;
  }

  function pickFirstText(renderer, selectors) {
    for (const selector of selectors) {
      const element = renderer.querySelector(selector);
      const text = extractText(element);
      if (text) {
        return text;
      }
    }
    return "";
  }

  function normalizeAuthorName(name) {
    const normalized = String(name || "")
      .replace(/^@+/, "")
      .trim();
    return normalized || "system";
  }

  function resolveAuthorName(renderer) {
    return normalizeAuthorName(
      extractText(renderer.querySelector("#author-name")) ||
        extractText(renderer.querySelector(".author-name")) ||
        "system"
    );
  }

  function resolveAvatarUrl(renderer) {
    const image = renderer.querySelector(
      "#author-photo img, img#img, yt-img-shadow img, img"
    );
    if (!image) {
      return "";
    }

    return getImageSource(image);
  }

  /**
   * @param {string} text
   * @returns {OverlayMessageRun|null}
   */
  function makeTextRun(text) {
    const value = String(text || "");
    if (!value) {
      return null;
    }
    return {
      type: "text",
      text: value
    };
  }

  /**
   * @param {string} src
   * @param {string} alt
   * @returns {OverlayMessageRun|null}
   */
  function makeEmojiRun(src, alt) {
    const imageSrc = String(src || "");
    if (!imageSrc) {
      return null;
    }
    return {
      type: "emoji",
      src: imageSrc,
      alt: String(alt || "")
    };
  }

  /**
   * @param {OverlayMessageRun[]} runs
   * @returns {OverlayMessageRun[]}
   */
  function compactRuns(runs) {
    const compacted = [];
    for (const run of runs) {
      if (!run) {
        continue;
      }

      if (run.type === "text") {
        const text = String(run.text || "");
        if (!text) {
          continue;
        }

        const prev = compacted[compacted.length - 1];
        if (prev && prev.type === "text") {
          prev.text = `${prev.text || ""}${text}`;
        } else {
          compacted.push({ type: "text", text });
        }
        continue;
      }

      if (run.type === "emoji" && run.src) {
        compacted.push(run);
      }
    }
    return compacted;
  }

  /**
   * @param {Element|null} element
   * @returns {OverlayMessageRun[]}
   */
  function parseRunsFromElement(element) {
    if (!element) {
      return [];
    }

    /** @type {OverlayMessageRun[]} */
    const runs = [];

    const walk = (node) => {
      if (!node) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        const run = makeTextRun(text);
        if (run) {
          runs.push(run);
        }
        return;
      }

      if (!(node instanceof Element)) {
        return;
      }

      const tag = node.tagName.toLowerCase();
      if (tag === "img") {
        const emojiRun = makeEmojiRun(getImageSource(node), node.getAttribute("alt") || "");
        if (emojiRun) {
          runs.push(emojiRun);
          return;
        }

        const altText = makeTextRun(node.getAttribute("alt") || "");
        if (altText) {
          runs.push(altText);
        }
        return;
      }

      const backgroundEmojiSrc = getEmojiElementBackgroundSource(node);
      if (backgroundEmojiSrc) {
        const emojiRun = makeEmojiRun(
          backgroundEmojiSrc,
          node.getAttribute("alt") ||
            node.getAttribute("aria-label") ||
            node.getAttribute("title") ||
            ""
        );
        if (emojiRun) {
          runs.push(emojiRun);
          return;
        }
      }

      if (tag === "br") {
        runs.push({ type: "text", text: "\n" });
        return;
      }

      for (const child of node.childNodes) {
        walk(child);
      }
    };

    walk(element);
    return compactRuns(runs);
  }

  function buildRunsFromSelectors(renderer, selectors) {
    for (const selector of selectors) {
      const element = renderer.querySelector(selector);
      if (!element) {
        continue;
      }

      const runs = parseRunsFromElement(element);
      if (runs.length > 0) {
        return runs;
      }

      const text = extractText(element);
      const fallbackRun = makeTextRun(text);
      if (fallbackRun) {
        return [fallbackRun];
      }
    }
    return [];
  }

  /**
   * @param {OverlayMessageRun[]} runs
   * @returns {string}
   */
  function runsToPlainText(runs) {
    const text = runs
      .map((run) => {
        if (run.type === "emoji") {
          return run.alt || "";
        }
        return run.text || "";
      })
      .join("");

    return text.replace(/\s+/g, " ").trim();
  }

  function resolveAuthorBadges(renderer) {
    /** @type {OverlayAuthorBadge[]} */
    const badges = [];
    const seen = new Set();

    for (const badgeNode of renderer.querySelectorAll("yt-live-chat-author-badge-renderer")) {
      const image = badgeNode.querySelector("img");
      const iconUrl = getImageSource(image);
      const label =
        badgeNode.getAttribute("aria-label") ||
        badgeNode.getAttribute("shared-tooltip-text") ||
        badgeNode.getAttribute("type") ||
        (image ? image.getAttribute("alt") || "" : "") ||
        "";

      const key = `${iconUrl}|${label}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      if (iconUrl || label) {
        badges.push({ iconUrl, label });
      }
    }

    return badges;
  }

  function resolveMessageRuns(renderer, type) {
    /** @type {OverlayMessageRun[]} */
    const runs = [];

    if (type === "paid") {
      const amount = pickFirstText(renderer, [
        "#purchase-amount",
        "#purchase-amount-chip",
        ".purchase-amount-chip"
      ]);
      const amountRun = makeTextRun(amount ? `${amount} ` : "");
      if (amountRun) {
        runs.push(amountRun);
      }

      runs.push(...buildRunsFromSelectors(renderer, ["#message", ".message"]));
      return compactRuns(runs);
    }

    if (type === "membership") {
      const header = pickFirstText(renderer, ["#header-subtext", "#header-primary-text"]);
      const headerRun = makeTextRun(header ? `${header} ` : "");
      if (headerRun) {
        runs.push(headerRun);
      }

      runs.push(...buildRunsFromSelectors(renderer, ["#message", ".message"]));
      return compactRuns(runs);
    }

    if (type === "sticker") {
      const amount = pickFirstText(renderer, [
        "#purchase-amount-chip",
        "#purchase-amount",
        ".purchase-amount-chip"
      ]);
      const amountRun = makeTextRun(amount ? `${amount} ` : "");
      if (amountRun) {
        runs.push(amountRun);
      }
      runs.push(...buildRunsFromSelectors(renderer, ["#message", "#sticker", ".message"]));
      return compactRuns(runs);
    }

    if (type === "engagement" || type === "mode_change") {
      runs.push(...buildRunsFromSelectors(renderer, ["#message", "#text"]));
      return compactRuns(runs);
    }

    runs.push(...buildRunsFromSelectors(renderer, ["#message", ".message"]));
    return compactRuns(runs);
  }

  function resolveAccentColor(renderer, type) {
    const authorNode = renderer.querySelector("#author-name");
    const typeInfo = TYPE_INFO[type] || TYPE_INFO.text;

    try {
      if (authorNode) {
        const authorColor = window.getComputedStyle(authorNode).color;
        if (authorColor && authorColor !== "rgba(0, 0, 0, 0)") {
          return authorColor;
        }
      }

      if (type === "paid") {
        const paidColor = window
          .getComputedStyle(renderer)
          .getPropertyValue("--yt-live-chat-paid-message-primary-color")
          .trim();
        if (paidColor) {
          return paidColor;
        }
      }
    } catch (_error) {
      return typeInfo.fallbackColor;
    }

    return typeInfo.fallbackColor;
  }

  function resolveMessageText(renderer, type) {
    switch (type) {
      case "text":
        return pickFirstText(renderer, ["#message", ".message"]);
      case "paid": {
        const amount = pickFirstText(renderer, [
          "#purchase-amount",
          "#purchase-amount-chip",
          ".purchase-amount-chip"
        ]);
        const body = pickFirstText(renderer, ["#message", ".message"]);
        return [amount, body].filter(Boolean).join(" ");
      }
      case "membership": {
        const header = pickFirstText(renderer, [
          "#header-subtext",
          "#header-primary-text"
        ]);
        const body = pickFirstText(renderer, ["#message", ".message"]);
        return [header, body].filter(Boolean).join(" ");
      }
      case "sticker": {
        const amount = pickFirstText(renderer, [
          "#purchase-amount-chip",
          "#purchase-amount",
          ".purchase-amount-chip"
        ]);
        const sticker = pickFirstText(renderer, ["#sticker", "#message"]);
        return [amount, sticker].filter(Boolean).join(" ");
      }
      case "engagement":
      case "mode_change":
        return pickFirstText(renderer, ["#message", "#text"]);
      default:
        return "";
    }
  }

  function resolveTimestampToken(renderer, timestampMs) {
    const token = pickFirstText(renderer, ["#timestamp", ".timestamp"]);
    if (token) {
      return token;
    }

    return String(Math.floor(timestampMs / 1000));
  }

  function buildMessageId(renderer, type, authorName, text, timestampToken) {
    const directId =
      renderer.getAttribute("data-id") ||
      renderer.getAttribute("data-item-id") ||
      renderer.getAttribute("data-message-id") ||
      renderer.getAttribute("id");

    if (directId && directId !== "message") {
      return `${type}|${directId}`;
    }

    return `${type}|${authorName}|${text}|${timestampToken}`;
  }

  /**
   * @param {Element} renderer
   * @returns {OverlayMessage|null}
   */
  function parseRendererMessage(renderer) {
    const type = mapRendererType(renderer);
    if (!type) {
      return null;
    }

    const authorName = resolveAuthorName(renderer);
    const timestampMs = Date.now();
    const messageRuns = resolveMessageRuns(renderer, type);
    const runsText = runsToPlainText(messageRuns);
    const rawText = runsText || resolveMessageText(renderer, type);
    const label = TYPE_INFO[type] ? TYPE_INFO[type].label : "";
    const text = rawText || label || "";
    const timestampToken = resolveTimestampToken(renderer, timestampMs);
    const id = buildMessageId(renderer, type, authorName, text, timestampToken);

    if (state.seenMessageIds.has(id)) {
      return null;
    }

    markSeenId(id);

    return {
      id,
      type,
      authorName,
      authorAvatarUrl: resolveAvatarUrl(renderer),
      text,
      messageRuns,
      authorBadges: resolveAuthorBadges(renderer),
      timestampMs,
      accentColor: resolveAccentColor(renderer, type),
      priority: TYPE_INFO[type] ? TYPE_INFO[type].priority : 1
    };
  }

  function markSeenId(id) {
    state.seenMessageIds.add(id);
    state.seenIdOrder.push(id);

    if (state.seenIdOrder.length > 2000) {
      const expired = state.seenIdOrder.shift();
      if (expired) {
        state.seenMessageIds.delete(expired);
      }
    }
  }

  function enqueueMessage(message) {
    if (!state.isActive) {
      return;
    }
    rememberMessageHistory(message);
    if (state.messageNodes.has(message.id)) {
      return;
    }

    state.renderQueue.push(message);
    scheduleFlush();
  }

  function rememberMessageHistory(message) {
    if (!message || !message.id) {
      return;
    }
    if (state.messageHistoryMap.has(message.id)) {
      return;
    }

    state.messageHistoryMap.set(message.id, message);
    state.messageHistoryOrder.push(message.id);

    const maxHistory = 1000;
    while (state.messageHistoryOrder.length > maxHistory) {
      const expiredId = state.messageHistoryOrder.shift();
      if (!expiredId) {
        continue;
      }
      state.messageHistoryMap.delete(expiredId);
    }
  }

  function queueMessageRemoval(messageId, immediate) {
    state.removeQueue.push({
      messageId,
      immediate: Boolean(immediate)
    });
    scheduleFlush();
  }

  function revealHistoryDuringDrag() {
    if (!state.dragState.active || !state.isActive) {
      return;
    }

    const lane = state.overlayUI.lane;
    if (!lane) {
      return;
    }

    const profile = getCurrentModeProfile();
    const targetIds = state.messageHistoryOrder.slice(-Math.max(1, profile.maxVisible));
    if (targetIds.length === 0) {
      return;
    }

    const targetSet = new Set(targetIds);

    for (const currentId of [...state.messageOrder]) {
      if (!targetSet.has(currentId)) {
        removeMessageNode(currentId, true);
      }
    }

    const nextOrder = [];
    for (const messageId of targetIds) {
      const message = state.messageHistoryMap.get(messageId);
      if (!message) {
        continue;
      }

      let node = state.messageNodes.get(messageId);
      if (!node) {
        node = createMessageRow(message);
        node.style.transition = "none";
        node.style.opacity = "1";
        node.style.transform = "translateX(0)";
        state.messageNodes.set(messageId, node);
      }

      node.dataset.dragPinned = "1";
      clearMessageTimer(messageId);
      lane.appendChild(node);
      nextOrder.push(messageId);
    }

    state.messageOrder = nextOrder;
    syncDragOverlayLayout();
  }

  function triggerSequentialFadeOutForVisibleMessages() {
    if (!state.isActive) {
      return;
    }

    if (state.expireDrainTimer) {
      window.clearTimeout(state.expireDrainTimer);
      state.expireDrainTimer = 0;
    }

    for (const messageId of state.messageOrder) {
      if (!state.messageNodes.has(messageId)) {
        continue;
      }
      clearMessageTimer(messageId);
      enqueueExpiredMessage(messageId);
    }

    if (state.expiredMessageIds.length > 0) {
      scheduleExpiredDrain(0);
    }
  }

  function discardExpiredMessage(messageId) {
    if (!state.expiredMessageIdSet.has(messageId)) {
      return;
    }

    state.expiredMessageIdSet.delete(messageId);
    state.expiredMessageIds = state.expiredMessageIds.filter((id) => id !== messageId);
  }

  function enqueueExpiredMessage(messageId) {
    if (state.expiredMessageIdSet.has(messageId)) {
      return;
    }

    state.expiredMessageIdSet.add(messageId);
    state.expiredMessageIds.push(messageId);
    scheduleExpiredDrain();
  }

  function scheduleExpiredDrain(delayMs) {
    if (state.expireDrainTimer) {
      return;
    }

    const delay = typeof delayMs === "number" ? delayMs : 0;
    state.expireDrainTimer = window.setTimeout(processExpiredQueue, delay);
  }

  function processExpiredQueue() {
    state.expireDrainTimer = 0;

    if (!state.isActive) {
      state.expiredMessageIds = [];
      state.expiredMessageIdSet.clear();
      return;
    }

    if (state.dragState.active) {
      if (state.expiredMessageIds.length > 0) {
        scheduleExpiredDrain(200);
      }
      return;
    }

    let nextId = "";
    for (const id of state.messageOrder) {
      if (state.expiredMessageIdSet.has(id) && state.messageNodes.has(id)) {
        nextId = id;
        break;
      }
    }

    if (nextId) {
      discardExpiredMessage(nextId);
      queueMessageRemoval(nextId, false);
    } else {
      state.expiredMessageIds = [];
      state.expiredMessageIdSet.clear();
    }

    if (state.expiredMessageIds.length > 0) {
      const profile = getCurrentModeProfile();
      scheduleExpiredDrain(Math.max(0, Math.round(profile.sequentialFadeSec * 1000)));
    }
  }

  function scheduleFlush() {
    if (state.flushRaf) {
      return;
    }

    state.flushRaf = window.requestAnimationFrame(flushQueues);
  }

  function flushQueues() {
    state.flushRaf = 0;

    if (!state.isActive) {
      state.renderQueue.length = 0;
      state.removeQueue.length = 0;
      state.expiredMessageIds = [];
      state.expiredMessageIdSet.clear();
      if (state.expireDrainTimer) {
        window.clearTimeout(state.expireDrainTimer);
        state.expireDrainTimer = 0;
      }
      return;
    }

    ensureOverlayUI();
    const lane = state.overlayUI.lane;
    if (!lane) {
      return;
    }

    while (state.renderQueue.length) {
      const message = state.renderQueue.shift();
      if (!message || state.messageNodes.has(message.id)) {
        continue;
      }

      const row = createMessageRow(message);
      lane.appendChild(row);
      state.messageNodes.set(message.id, row);
      state.messageOrder.push(message.id);

      const timer = window.setTimeout(() => {
        enqueueExpiredMessage(message.id);
      }, getCurrentModeProfile().ttlMs);
      state.activeTimers.set(message.id, timer);
    }

    enforceMaxVisible();

    while (state.removeQueue.length) {
      const item = state.removeQueue.shift();
      if (!item) {
        continue;
      }
      removeMessageNode(item.messageId, item.immediate);
    }

    if (state.dragState.active) {
      revealHistoryDuringDrag();
    }
    syncDragOverlayLayout();
  }

  function enforceMaxVisible() {
    const profile = getCurrentModeProfile();
    while (state.messageOrder.length > profile.maxVisible) {
      const oldestId = state.messageOrder[0];
      if (!oldestId) {
        break;
      }
      removeMessageNode(oldestId, true);
    }
  }

  function createAvatarNode(message) {
    const avatar = document.createElement("div");
    avatar.className = "yt-chat-overlay-avatar";
    avatar.style.borderRadius = "999px";
    avatar.style.overflow = "hidden";
    avatar.style.border = "2px solid rgba(255, 255, 255, 0.65)";
    avatar.style.background = "rgba(255, 255, 255, 0.18)";
    avatar.style.display = "flex";
    avatar.style.alignItems = "center";
    avatar.style.justifyContent = "center";

    if (message.authorAvatarUrl) {
      const image = document.createElement("img");
      image.src = message.authorAvatarUrl;
      image.alt = message.authorName || "avatar";
      image.style.width = "100%";
      image.style.height = "100%";
      image.style.objectFit = "cover";
      avatar.appendChild(image);
      return avatar;
    }

    const fallback = document.createElement("span");
    fallback.textContent = (message.authorName || "?").slice(0, 1).toUpperCase();
    fallback.style.color = "white";
    fallback.style.fontWeight = "800";
    fallback.style.fontSize = "20px";
    avatar.appendChild(fallback);
    return avatar;
  }

  function createBadgeWrap(authorBadges) {
    if (!Array.isArray(authorBadges) || authorBadges.length === 0) {
      return null;
    }

    const wrap = document.createElement("span");
    wrap.className = "yt-chat-overlay-badges";

    for (const badge of authorBadges) {
      const item = document.createElement("span");
      item.className = "yt-chat-overlay-badge-item";

      if (badge.iconUrl) {
        const icon = document.createElement("img");
        icon.className = "yt-chat-overlay-badge-icon";
        icon.src = badge.iconUrl;
        icon.alt = badge.label || "badge";
        item.appendChild(icon);
      } else if (badge.label) {
        const label = document.createElement("span");
        label.className = "yt-chat-overlay-badge-label";
        label.textContent = badge.label.slice(0, 2);
        item.appendChild(label);
      }

      if (item.childNodes.length > 0) {
        wrap.appendChild(item);
      }
    }

    if (wrap.childNodes.length === 0) {
      return null;
    }
    return wrap;
  }

  function appendMessageRuns(target, message) {
    const runs = Array.isArray(message.messageRuns) ? message.messageRuns : [];
    if (runs.length === 0) {
      target.textContent = message.text || "";
      return;
    }

    for (const run of runs) {
      if (run.type === "emoji" && run.src) {
        const emoji = document.createElement("img");
        emoji.className = "yt-chat-overlay-inline-emoji";
        emoji.src = run.src;
        emoji.alt = run.alt || "";
        target.appendChild(emoji);
        continue;
      }

      const text = run.text || "";
      if (text) {
        target.appendChild(document.createTextNode(text));
      }
    }
  }

  function applyRowStyles(row) {
    const profile = getCurrentModeProfile();
    const fontSizePx = profile.fontSizePx;
    const avatarSizePx = profile.avatarSizePx;
    const strokePx = profile.strokePx;
    const avatar = row.querySelector(".yt-chat-overlay-avatar");
    const textWrap = row.querySelector(".yt-chat-overlay-text-wrap");
    const authorMeta = row.querySelector(".yt-chat-overlay-author-meta");
    const author = row.querySelector(".yt-chat-overlay-author");
    const badges = row.querySelector(".yt-chat-overlay-badges");
    const body = row.querySelector(".yt-chat-overlay-body");

    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.maxWidth = "100%";
    row.style.gap = profile.showAvatar
      ? `${Math.max(6, Math.round(avatarSizePx * 0.2))}px`
      : "0px";
    row.style.padding = `${Math.max(2, Math.round(fontSizePx * 0.12))}px ${Math.max(
      8,
      Math.round(fontSizePx * 0.45)
    )}px`;
    row.style.background = `rgba(0, 0, 0, ${profile.messageBgOpacity})`;
    row.style.borderRadius = `${Math.max(8, Math.round(fontSizePx * 0.55))}px`;
    row.style.backdropFilter = "blur(1px)";

    if (avatar) {
      if (profile.showAvatar) {
        avatar.style.display = "flex";
        avatar.style.width = `${avatarSizePx}px`;
        avatar.style.height = `${avatarSizePx}px`;
        avatar.style.minWidth = `${avatarSizePx}px`;
      } else {
        avatar.style.display = "none";
      }
    }

    if (textWrap) {
      textWrap.style.display = "flex";
      textWrap.style.alignItems = "center";
      textWrap.style.flexWrap = "nowrap";
      textWrap.style.gap = `${Math.max(6, Math.round(fontSizePx * 0.3))}px`;
      textWrap.style.minWidth = "0";
      textWrap.style.maxWidth = "100%";
      textWrap.style.flex = "1 1 auto";
      textWrap.style.overflow = "visible";
    }

    const outlineShadow = createOutlineShadow(strokePx);
    if (authorMeta) {
      const hasBadge = Boolean(badges && badges.childElementCount > 0);
      authorMeta.style.display =
        profile.showAuthorName || hasBadge ? "inline-flex" : "none";
      authorMeta.style.alignItems = "center";
      authorMeta.style.gap = `${Math.max(4, Math.round(fontSizePx * 0.16))}px`;
      authorMeta.style.marginRight = "0";
      authorMeta.style.verticalAlign = "middle";
      authorMeta.style.flex = "0 0 auto";
    }

    if (author) {
      author.style.color = row.dataset.accentColor || TYPE_INFO.text.fallbackColor;
      author.style.display = profile.showAuthorName ? "inline" : "none";
      author.style.opacity = String(profile.textOpacity);
      author.style.fontWeight = String(profile.fontWeight);
      author.style.fontSize = `${fontSizePx}px`;
      author.style.lineHeight = "1.1";
      author.style.webkitTextStroke = "0px transparent";
      author.style.textShadow = outlineShadow;
      author.style.whiteSpace = "nowrap";
      author.style.writingMode = "horizontal-tb";
      author.style.textOrientation = "mixed";
    }

    if (badges) {
      badges.style.display = "inline-flex";
      badges.style.alignItems = "center";
      badges.style.gap = `${Math.max(2, Math.round(fontSizePx * 0.1))}px`;
      badges.style.verticalAlign = "middle";
      badges.style.opacity = String(profile.textOpacity);
    }

    for (const badgeIcon of row.querySelectorAll(".yt-chat-overlay-badge-icon")) {
      const badgeSize = Math.max(14, Math.round(fontSizePx * 0.9));
      badgeIcon.style.width = `${badgeSize}px`;
      badgeIcon.style.height = `${badgeSize}px`;
      badgeIcon.style.objectFit = "contain";
      badgeIcon.style.verticalAlign = "middle";
    }

    for (const badgeLabel of row.querySelectorAll(".yt-chat-overlay-badge-label")) {
      badgeLabel.style.display = "inline-flex";
      badgeLabel.style.alignItems = "center";
      badgeLabel.style.justifyContent = "center";
      badgeLabel.style.minWidth = `${Math.max(14, Math.round(fontSizePx * 0.85))}px`;
      badgeLabel.style.height = `${Math.max(14, Math.round(fontSizePx * 0.85))}px`;
      badgeLabel.style.padding = "0 4px";
      badgeLabel.style.borderRadius = "999px";
      badgeLabel.style.background = "rgba(255, 255, 255, 0.22)";
      badgeLabel.style.color = "#ffffff";
      badgeLabel.style.fontSize = `${Math.max(10, Math.round(fontSizePx * 0.45))}px`;
      badgeLabel.style.fontWeight = "700";
      badgeLabel.style.lineHeight = "1";
    }

    if (body) {
      body.style.color = "#ffffff";
      body.style.opacity = String(profile.textOpacity);
      body.style.fontWeight = String(profile.fontWeight);
      body.style.fontSize = `${fontSizePx}px`;
      body.style.lineHeight = "1.1";
      body.style.webkitTextStroke = "0px transparent";
      body.style.textShadow = outlineShadow;
      body.style.minWidth = "0";
      body.style.whiteSpace = "pre-wrap";
      body.style.overflowWrap = "anywhere";
      body.style.wordBreak = "break-word";
      body.style.display = "block";
      body.style.verticalAlign = "middle";
      body.style.flex = "1 1 auto";
      body.style.alignSelf = "center";
      body.style.writingMode = "horizontal-tb";
      body.style.textOrientation = "mixed";
    }

    for (const emoji of row.querySelectorAll(".yt-chat-overlay-inline-emoji")) {
      const emojiSize = Math.max(16, Math.round(fontSizePx * 1.08));
      emoji.style.width = `${emojiSize}px`;
      emoji.style.height = `${emojiSize}px`;
      emoji.style.minWidth = `${emojiSize}px`;
      emoji.style.objectFit = "contain";
      emoji.style.verticalAlign = "text-bottom";
      emoji.style.margin = "0 0.08em";
      emoji.style.display = "inline-block";
    }
  }

  function createOutlineShadow(strokePx) {
    const distance = Math.max(0, Number(strokePx) || 0);
    const shadows = [];

    if (distance > 0) {
      shadows.push(`${distance}px 0 0 rgba(0, 0, 0, 0.95)`);
      shadows.push(`-${distance}px 0 0 rgba(0, 0, 0, 0.95)`);
      shadows.push(`0 ${distance}px 0 rgba(0, 0, 0, 0.95)`);
      shadows.push(`0 -${distance}px 0 rgba(0, 0, 0, 0.95)`);
      shadows.push(`${distance}px ${distance}px 0 rgba(0, 0, 0, 0.95)`);
      shadows.push(`${distance}px -${distance}px 0 rgba(0, 0, 0, 0.95)`);
      shadows.push(`-${distance}px ${distance}px 0 rgba(0, 0, 0, 0.95)`);
      shadows.push(`-${distance}px -${distance}px 0 rgba(0, 0, 0, 0.95)`);
    }

    shadows.push("0 2px 6px rgba(0, 0, 0, 0.85)");
    return shadows.join(", ");
  }

  function updateExistingRowStyles() {
    for (const row of state.messageNodes.values()) {
      applyRowStyles(row);
    }
    syncDragOverlayLayout();
  }

  function createMessageRow(message) {
    const row = document.createElement("div");
    row.dataset.messageId = message.id;
    row.dataset.accentColor = message.accentColor || "";
    row.style.opacity = "0";
    row.style.transform = "translateX(-8px)";
    row.style.transition = "opacity 220ms ease, transform 220ms ease";

    const avatar = createAvatarNode(message);
    row.appendChild(avatar);

    const textWrap = document.createElement("div");
    textWrap.className = "yt-chat-overlay-text-wrap";

    const authorMeta = document.createElement("span");
    authorMeta.className = "yt-chat-overlay-author-meta";

    const author = document.createElement("span");
    author.className = "yt-chat-overlay-author";
    author.textContent = `@${message.authorName || "system"}`;
    authorMeta.appendChild(author);

    const badges = createBadgeWrap(message.authorBadges);
    if (badges) {
      authorMeta.appendChild(badges);
    }

    const body = document.createElement("span");
    body.className = "yt-chat-overlay-body";
    appendMessageRuns(body, message);

    textWrap.appendChild(authorMeta);
    textWrap.appendChild(body);
    row.appendChild(textWrap);

    applyRowStyles(row);

    window.requestAnimationFrame(() => {
      row.style.opacity = "1";
      row.style.transform = "translateX(0)";
    });

    return row;
  }

  function clearMessageTimer(messageId) {
    const timer = state.activeTimers.get(messageId);
    if (typeof timer === "number") {
      window.clearTimeout(timer);
    }
    state.activeTimers.delete(messageId);
    discardExpiredMessage(messageId);
  }

  function removeMessageNode(messageId, immediate) {
    const node = state.messageNodes.get(messageId);
    clearMessageTimer(messageId);

    state.messageNodes.delete(messageId);
    const orderIndex = state.messageOrder.indexOf(messageId);
    if (orderIndex !== -1) {
      state.messageOrder.splice(orderIndex, 1);
    }

    if (!node) {
      return;
    }

    if (immediate) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      syncDragOverlayLayout();
      return;
    }

    const profile = getCurrentModeProfile();
    const fadeMs = profile.fadeMs;
    const fadeShiftPx = Math.max(24, Math.round(profile.fontSizePx * 2));
    node.style.transition = `opacity ${fadeMs}ms ease, transform ${fadeMs}ms ease`;
    node.style.opacity = "0";
    node.style.transform = `translateX(-${fadeShiftPx}px)`;

    window.setTimeout(() => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      syncDragOverlayLayout();
    }, fadeMs);
  }

  function clearAllMessages() {
    state.renderQueue.length = 0;
    state.removeQueue.length = 0;
    state.expiredMessageIds = [];
    state.expiredMessageIdSet.clear();
    if (state.expireDrainTimer) {
      window.clearTimeout(state.expireDrainTimer);
      state.expireDrainTimer = 0;
    }

    for (const messageId of state.messageNodes.keys()) {
      clearMessageTimer(messageId);
    }

    const lane = state.overlayUI.lane;
    if (lane) {
      lane.textContent = "";
    }

    state.messageNodes.clear();
    state.messageOrder = [];
    state.messageHistoryOrder = [];
    state.messageHistoryMap.clear();
    state.activeTimers.clear();
    state.seenMessageIds.clear();
    state.seenIdOrder = [];
    syncDragOverlayLayout();
  }

  function activateOverlay() {
    state.isActive = true;
    ensureOverlayUI();
    if (shouldHideNativeChat()) {
      hideNativeChat();
    } else {
      restoreNativeChat();
    }
    connectChatSource();
  }

  function deactivateOverlay() {
    state.isActive = false;
    disconnectChatSource();
    removeHiddenChatIframe();
    clearAllMessages();
    restoreNativeChat();
    removeOverlayUI();

    if (state.flushRaf) {
      window.cancelAnimationFrame(state.flushRaf);
      state.flushRaf = 0;
    }
  }

  function syncOverlayState() {
    state.syncRaf = 0;

    if (!shouldEnableOverlay()) {
      if (state.isActive) {
        deactivateOverlay();
      }
      return;
    }

    if (!state.isActive) {
      activateOverlay();
      return;
    }

    ensureOverlayUI();
    updateExistingRowStyles();
    if (shouldHideNativeChat()) {
      hideNativeChat();
    } else {
      restoreNativeChat();
    }
    connectChatSource();
  }

  function scheduleSync() {
    if (state.syncRaf) {
      return;
    }

    state.syncRaf = window.requestAnimationFrame(syncOverlayState);
  }

  function startPageObserver() {
    if (state.pageObserver) {
      return;
    }

    state.pageObserver = new MutationObserver(() => {
      if (shouldEnableOverlay()) {
        scheduleSync();
      }
    });

    state.pageObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function handleNavigation() {
    deactivateOverlay();
    scheduleSync();
  }

  function initialize() {
    watchStorageChanges();

    loadConfigFromStorage().finally(() => {
      document.addEventListener("fullscreenchange", scheduleSync, true);
      document.addEventListener("webkitfullscreenchange", scheduleSync, true);
      window.addEventListener("resize", scheduleSync, true);
      window.addEventListener("yt-page-data-updated", scheduleSync, true);
      window.addEventListener("yt-navigate-finish", handleNavigation, true);

      startPageObserver();
      scheduleSync();
    });
  }

  initialize();
})();
