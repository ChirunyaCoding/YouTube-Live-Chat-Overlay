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
   * @property {{open: {fullscreen: OverlayModeProfile, theater: OverlayModeProfile, normal: OverlayModeProfile}, closed: {fullscreen: OverlayModeProfile, theater: OverlayModeProfile, normal: OverlayModeProfile}}} panelModeProfiles
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
  const PANEL_STATE_KEYS = ["open", "closed"];
  const EDIT_DUMMY_ID_PREFIX = "__yt_edit_dummy__";
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

  function createPanelModeProfiles(modeProfile) {
    return {
      open: createModeProfiles(modeProfile),
      closed: createModeProfiles(modeProfile)
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
    panelModeProfiles: createPanelModeProfiles(DEFAULT_MODE_PROFILE),
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
    "yt-live-chat-sponsorships-gift-purchase-announcement-renderer",
    "yt-live-chat-sponsorships-gift-redemption-announcement-renderer",
    "yt-live-chat-membership-gift-purchase-announcement-renderer",
    "yt-live-chat-membership-gift-redemption-announcement-renderer",
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
      dragFrame: null,
      editButton: null,
      controlsHost: null,
      blockHost: null
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
    editDummySeq: 0,
    expiredMessageIds: [],
    expiredMessageIdSet: new Set(),
    expireDrainTimer: 0,
    configSaveTimer: 0,
    dragState: {
      active: false,
      editModeEnabled: false,
      pointerId: null,
      mode: "fullscreen",
      panelState: "closed",
      startClientX: 0,
      startClientY: 0,
      startOffsetXPx: 0,
      startOffsetYPx: 0
    },
    flushRaf: 0,
    syncRaf: 0
  };

  let parserApi = null;
  let rendererApi = null;

  function getParserApi() {
    if (parserApi) {
      return parserApi;
    }

    const parserNamespace =
      typeof window !== "undefined" ? window.YTChatOverlayParser : null;
    const createParser = parserNamespace && parserNamespace.create;
    if (typeof createParser !== "function") {
      console.error("[yt-chat-overlay] parser module is missing.");
      return null;
    }

    parserApi = createParser({
      rendererSelector: RENDERER_SELECTOR,
      typeInfo: TYPE_INFO,
      getCurrentModeProfile,
      hasSeenId: (id) => state.seenMessageIds.has(id),
      markSeenId
    });
    return parserApi;
  }

  function getRendererApi() {
    if (rendererApi) {
      return rendererApi;
    }

    const rendererNamespace =
      typeof window !== "undefined" ? window.YTChatOverlayRenderer : null;
    const createRenderer = rendererNamespace && rendererNamespace.create;
    if (typeof createRenderer !== "function") {
      console.error("[yt-chat-overlay] renderer module is missing.");
      return null;
    }

    rendererApi = createRenderer({
      typeInfo: TYPE_INFO,
      getCurrentModeProfile
    });
    return rendererApi;
  }

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
    const panelModeProfilesInput =
      input.panelModeProfiles && typeof input.panelModeProfiles === "object"
        ? input.panelModeProfiles
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

    const panelModeProfiles = createPanelModeProfiles(DEFAULT_MODE_PROFILE);
    for (const panelState of PANEL_STATE_KEYS) {
      const panelInput =
        panelModeProfilesInput[panelState] &&
        typeof panelModeProfilesInput[panelState] === "object"
          ? panelModeProfilesInput[panelState]
          : {};

      for (const mode of MODE_KEYS) {
        panelModeProfiles[panelState][mode] = normalizeModeProfile(
          panelInput[mode],
          modeProfiles[mode]
        );
      }
    }

    const sharedTextOpacity = clampNumber(
      input.textOpacity,
      0.1,
      1,
      panelModeProfiles.closed.fullscreen.textOpacity
    );
    const sharedMessageBgOpacity = clampNumber(
      input.messageBgOpacity,
      0,
      0.9,
      panelModeProfiles.closed.fullscreen.messageBgOpacity
    );
    for (const panelState of PANEL_STATE_KEYS) {
      for (const mode of MODE_KEYS) {
        panelModeProfiles[panelState][mode].textOpacity = sharedTextOpacity;
        panelModeProfiles[panelState][mode].messageBgOpacity = sharedMessageBgOpacity;
      }
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
      modeProfiles: panelModeProfiles.closed,
      panelModeProfiles,
      // Kept for backward compatibility with older code paths.
      maxVisible: panelModeProfiles.closed.fullscreen.maxVisible,
      ttlMs: panelModeProfiles.closed.fullscreen.ttlMs,
      fadeMs: panelModeProfiles.closed.fullscreen.fadeMs,
      sequentialFadeSec: panelModeProfiles.closed.fullscreen.sequentialFadeSec,
      laneWidthPercent: panelModeProfiles.closed.fullscreen.laneWidthPercent,
      fontSizePx: panelModeProfiles.closed.fullscreen.fontSizePx,
      fontWeight: panelModeProfiles.closed.fullscreen.fontWeight,
      avatarSizePx: panelModeProfiles.closed.fullscreen.avatarSizePx,
      rowGapPx: panelModeProfiles.closed.fullscreen.rowGapPx,
      horizontalAlign: panelModeProfiles.closed.fullscreen.horizontalAlign,
      verticalAlign: panelModeProfiles.closed.fullscreen.verticalAlign,
      offsetXPx: panelModeProfiles.closed.fullscreen.offsetXPx,
      offsetYPx: panelModeProfiles.closed.fullscreen.offsetYPx,
      strokePx: panelModeProfiles.closed.fullscreen.strokePx,
      textOpacity: panelModeProfiles.closed.fullscreen.textOpacity,
      messageBgOpacity: panelModeProfiles.closed.fullscreen.messageBgOpacity,
      showAvatar: panelModeProfiles.closed.fullscreen.showAvatar,
      showAuthorName: panelModeProfiles.closed.fullscreen.showAuthorName
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

  function isElementVisiblyDisplayed(node) {
    if (!(node instanceof Element)) {
      return false;
    }

    if (node.hasAttribute("hidden")) {
      return false;
    }

    const ariaHidden = String(node.getAttribute("aria-hidden") || "").toLowerCase();
    if (ariaHidden === "true") {
      return false;
    }

    try {
      const style = window.getComputedStyle(node);
      if (!style) {
        return false;
      }
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      if (Number(style.opacity) === 0) {
        return false;
      }
    } catch (_error) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) {
      return false;
    }
    if (rect.width < 40 || rect.height < 40) {
      return false;
    }

    const vw = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const vh = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    if (vw > 0 && vh > 0) {
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= vw || rect.top >= vh) {
        return false;
      }
    }

    return true;
  }

  function isChatContainerCollapsed(node) {
    if (!(node instanceof Element)) {
      return false;
    }

    const collapsedAttr = node.getAttribute("collapsed");
    if (
      collapsedAttr !== null &&
      collapsedAttr !== "" &&
      collapsedAttr !== "false" &&
      collapsedAttr !== "0"
    ) {
      return true;
    }

    if (node.matches("[collapsed]") || node.classList.contains("collapsed")) {
      return true;
    }

    return false;
  }

  function getCurrentChatPanelState() {
    const chatContainer = findChatContainer();
    if (isChatContainerCollapsed(chatContainer)) {
      return "closed";
    }

    const nativeIframe = findChatIframe();
    if (!isElementVisiblyDisplayed(nativeIframe)) {
      return "closed";
    }

    return "open";
  }

  function getModeProfile(mode, panelState) {
    const stateConfig = state.config && state.config.panelModeProfiles;
    const normalizedPanelState = panelState === "open" ? "open" : "closed";
    const normalizedMode = MODE_KEYS.includes(mode) ? mode : "fullscreen";
    if (
      stateConfig &&
      stateConfig[normalizedPanelState] &&
      stateConfig[normalizedPanelState][normalizedMode]
    ) {
      return stateConfig[normalizedPanelState][normalizedMode];
    }

    const fallbackConfig = DEFAULT_CONFIG.panelModeProfiles;
    return fallbackConfig[normalizedPanelState][normalizedMode];
  }

  function getCurrentModeProfile() {
    const mode = getCurrentDisplayMode();
    const panelState = getCurrentChatPanelState();
    return getModeProfile(mode, panelState);
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

  function updateEditButtonVisualState() {
    const button = state.overlayUI.editButton;
    if (!button) {
      return;
    }

    const enabled = Boolean(state.dragState.editModeEnabled);
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.textContent = enabled ? "編集ON" : "編集";
    button.style.color = enabled ? "#66d9ff" : "#ffffff";
    button.style.textShadow = enabled
      ? "0 0 8px rgba(88, 217, 255, 0.55)"
      : "0 0 6px rgba(0, 0, 0, 0.45)";
  }

  function syncEditModeUiState() {
    const handle = state.overlayUI.dragHandle;
    const frame = state.overlayUI.dragFrame;
    const enabled = Boolean(state.dragState.editModeEnabled);

    if (handle) {
      handle.style.pointerEvents = enabled ? "auto" : "none";
      handle.style.cursor = state.dragState.active ? "grabbing" : "grab";
    }

    if (frame) {
      frame.style.display = enabled || state.dragState.active ? "block" : "none";
    }

    updateEditButtonVisualState();
  }

  function setEditModeEnabled(enabled) {
    const next = Boolean(enabled);
    if (state.dragState.editModeEnabled === next) {
      syncEditModeUiState();
      return;
    }

    if (!next && state.dragState.active) {
      endOffsetDrag();
    }

    if (next) {
      state.renderQueue.length = 0;
      state.removeQueue.length = 0;
      state.expiredMessageIds = [];
      state.expiredMessageIdSet.clear();
      if (state.expireDrainTimer) {
        window.clearTimeout(state.expireDrainTimer);
        state.expireDrainTimer = 0;
      }
      for (const messageId of state.messageOrder) {
        clearMessageTimer(messageId);
      }
      for (const messageId of [...state.messageOrder]) {
        removeMessageNode(messageId, true);
      }
    }

    state.dragState.editModeEnabled = next;
    syncEditModeUiState();
    if (!next) {
      restoreVisibleMessagesFromHistory();
    }
    applyOverlayLayoutStyles();
    syncEditDummyRows();
  }

  function endOffsetDrag() {
    const drag = state.dragState;
    if (!drag.active) {
      syncEditModeUiState();
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
    syncEditModeUiState();

    for (const row of state.messageNodes.values()) {
      if (row && row.dataset) {
        delete row.dataset.dragPinned;
      }
    }
    triggerSequentialFadeOutForVisibleMessages();
    applyOverlayLayoutStyles();
    syncEditDummyRows();
    queueConfigSave(0);
  }

  function onDragHandlePointerDown(event) {
    if (!state.isActive) {
      return;
    }
    if (!state.dragState.editModeEnabled) {
      return;
    }
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (event.button !== 0) {
      return;
    }

    const mode = getCurrentDisplayMode();
    const panelState = getCurrentChatPanelState();
    const profile = getModeProfile(mode, panelState);
    if (!profile) {
      return;
    }

    state.dragState.active = true;
    state.dragState.pointerId = event.pointerId;
    state.dragState.mode = mode;
    state.dragState.panelState = panelState;
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

    syncEditModeUiState();
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
    const profile = getModeProfile(drag.mode, drag.panelState);
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

  function findEditButtonHost(host) {
    if (!host) {
      return null;
    }

    const selectors = [
      ".ytp-chrome-controls .ytp-right-controls",
      ".ytp-right-controls",
      ".ytp-chrome-controls .ytp-left-controls",
      ".ytp-left-controls"
    ];

    for (const selector of selectors) {
      const node = host.querySelector(selector);
      if (node instanceof Element) {
        return node;
      }
    }

    return null;
  }

  function onEditButtonClick(event) {
    if (event instanceof Event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!state.isActive) {
      return;
    }

    setEditModeEnabled(!state.dragState.editModeEnabled);
  }

  function isEditUiEventTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest("#yt-chat-overlay-edit-button") ||
        target.closest("#yt-chat-overlay-drag-handle")
    );
  }

  function onPlayerInteractionCapture(event) {
    if (!state.dragState.editModeEnabled) {
      return;
    }
    if (state.dragState.active) {
      return;
    }
    if (isEditUiEventTarget(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }

  function bindPlayerInteractionBlocker(host) {
    if (!(host instanceof Element)) {
      return;
    }
    if (state.overlayUI.blockHost === host) {
      return;
    }
    if (state.overlayUI.blockHost) {
      unbindPlayerInteractionBlocker();
    }

    const opts = { capture: true };
    host.addEventListener("pointerdown", onPlayerInteractionCapture, opts);
    host.addEventListener("click", onPlayerInteractionCapture, opts);
    host.addEventListener("dblclick", onPlayerInteractionCapture, opts);
    host.addEventListener("touchstart", onPlayerInteractionCapture, opts);
    host.addEventListener("touchend", onPlayerInteractionCapture, opts);
    state.overlayUI.blockHost = host;
  }

  function unbindPlayerInteractionBlocker() {
    const host = state.overlayUI.blockHost;
    if (!(host instanceof Element)) {
      state.overlayUI.blockHost = null;
      return;
    }

    const opts = { capture: true };
    host.removeEventListener("pointerdown", onPlayerInteractionCapture, opts);
    host.removeEventListener("click", onPlayerInteractionCapture, opts);
    host.removeEventListener("dblclick", onPlayerInteractionCapture, opts);
    host.removeEventListener("touchstart", onPlayerInteractionCapture, opts);
    host.removeEventListener("touchend", onPlayerInteractionCapture, opts);
    state.overlayUI.blockHost = null;
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
    let editButton = state.overlayUI.editButton;

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
      dragHandle.style.pointerEvents = "none";
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

      editButton = document.createElement("button");
      editButton.id = "yt-chat-overlay-edit-button";
      editButton.type = "button";
      editButton.className = "ytp-button";
      editButton.setAttribute("aria-label", "コメント位置編集");
      editButton.style.width = "auto";
      editButton.style.minWidth = "52px";
      editButton.style.padding = "0 10px";
      editButton.style.fontSize = "14px";
      editButton.style.fontWeight = "700";
      editButton.style.letterSpacing = "0.02em";
      editButton.style.lineHeight = "36px";
      editButton.style.position = "relative";
      editButton.style.zIndex = "2";
      editButton.style.pointerEvents = "auto";
      editButton.style.userSelect = "none";
      editButton.style.textShadow = "0 0 6px rgba(0, 0, 0, 0.45)";
      editButton.style.color = "#ffffff";
      editButton.textContent = "編集";
      editButton.addEventListener("click", onEditButtonClick);
      editButton.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
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
      if (
        state.overlayUI.controlsHost &&
        editButton &&
        editButton.parentNode === state.overlayUI.controlsHost
      ) {
        state.overlayUI.controlsHost.removeChild(editButton);
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

    bindPlayerInteractionBlocker(host);

    const controlsHost = findEditButtonHost(host);
    if (
      state.overlayUI.controlsHost &&
      state.overlayUI.controlsHost !== controlsHost &&
      editButton &&
      editButton.parentNode === state.overlayUI.controlsHost
    ) {
      state.overlayUI.controlsHost.removeChild(editButton);
    }
    if (controlsHost && editButton && editButton.parentNode !== controlsHost) {
      controlsHost.appendChild(editButton);
    }

    state.overlayUI.root = root;
    state.overlayUI.lane = lane;
    state.overlayUI.dragHandle = dragHandle;
    state.overlayUI.dragFrame = dragFrame;
    state.overlayUI.editButton = editButton;
    state.overlayUI.controlsHost = controlsHost || null;
    syncEditModeUiState();
    applyOverlayLayoutStyles();
    syncEditDummyRows();
  }

  function removeOverlayUI() {
    endOffsetDrag();
    setEditModeEnabled(false);
    unbindPlayerInteractionBlocker();

    const { root, host, hostOriginalPosition, dragHandle, dragFrame, editButton, controlsHost } =
      state.overlayUI;
    if (root && host && root.parentNode === host) {
      host.removeChild(root);
    }
    if (dragHandle && host && dragHandle.parentNode === host) {
      host.removeChild(dragHandle);
    }
    if (dragFrame && host && dragFrame.parentNode === host) {
      host.removeChild(dragFrame);
    }
    if (editButton && controlsHost && editButton.parentNode === controlsHost) {
      controlsHost.removeChild(editButton);
    }
    if (host && hostOriginalPosition !== null) {
      host.style.position = hostOriginalPosition;
    }

    state.overlayUI.root = null;
    state.overlayUI.lane = null;
    state.overlayUI.dragHandle = null;
    state.overlayUI.dragFrame = null;
    state.overlayUI.editButton = null;
    state.overlayUI.controlsHost = null;
    state.overlayUI.blockHost = null;
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
    const parser = getParserApi();
    if (!parser) {
      return;
    }

    const renderers = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        parser.collectRendererElements(node, renderers);
      }
    }

    if (!renderers.length) {
      return;
    }

    for (const renderer of renderers) {
      const message = parser.parseRendererMessage(renderer);
      if (message) {
        enqueueMessage(message);
      }
    }
  }

  function ingestExistingMessages(itemsNode) {
    const parser = getParserApi();
    if (!parser) {
      return;
    }

    const existing = Array.from(itemsNode.querySelectorAll(RENDERER_SELECTOR));
    const profile = getCurrentModeProfile();
    const startIndex = Math.max(0, existing.length - profile.maxVisible);
    for (let i = startIndex; i < existing.length; i += 1) {
      const message = parser.parseRendererMessage(existing[i]);
      if (message) {
        enqueueMessage(message);
      }
    }
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
    if (state.dragState.editModeEnabled) {
      return;
    }
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

  function countVisibleRealMessages() {
    let count = 0;
    for (const id of state.messageOrder) {
      if (state.messageNodes.has(id)) {
        count += 1;
      }
    }
    return count;
  }

  function createEditDummyMessage(index) {
    state.editDummySeq += 1;
    const authorName = "sample";
    const text = `ダミーコメント ${index}`;
    return {
      id: `${EDIT_DUMMY_ID_PREFIX}${state.editDummySeq}`,
      type: "engagement",
      authorName,
      authorAvatarUrl: "",
      text,
      messageRuns: [{ type: "text", text }],
      authorBadges: [],
      timestampMs: Date.now(),
      accentColor: "rgb(188, 188, 188)",
      priority: 0
    };
  }

  function createEditDummyRow(index) {
    const row = createMessageRow(createEditDummyMessage(index));
    row.dataset.editDummy = "1";
    const applyVisual = () => {
      row.style.transition = "none";
      row.style.opacity = "0.46";
      row.style.transform = "translateX(0)";
      row.style.border = "1px dashed rgba(255, 255, 255, 0.28)";
      row.style.pointerEvents = "none";
    };
    applyVisual();
    window.requestAnimationFrame(applyVisual);
    return row;
  }

  function applyEditDummyVisual(row) {
    if (!row) {
      return;
    }
    row.dataset.editDummy = "1";
    row.style.transition = "none";
    row.style.opacity = "0.46";
    row.style.transform = "translateX(0)";
    row.style.border = "1px dashed rgba(255, 255, 255, 0.28)";
    row.style.pointerEvents = "none";
  }

  function removeEditDummyRows() {
    const lane = state.overlayUI.lane;
    if (!lane) {
      return;
    }
    for (const dummy of Array.from(lane.querySelectorAll('[data-edit-dummy="1"]'))) {
      if (dummy.parentNode === lane) {
        lane.removeChild(dummy);
      }
    }
  }

  function syncEditDummyRows() {
    const lane = state.overlayUI.lane;
    if (!lane) {
      return;
    }

    if (!state.isActive || !state.dragState.editModeEnabled) {
      removeEditDummyRows();
      return;
    }

    const profile = getCurrentModeProfile();
    const maxVisible = Math.max(1, Math.round(profile.maxVisible));
    const realCount = countVisibleRealMessages();
    const neededCount = Math.max(0, maxVisible - realCount);

    const existing = Array.from(lane.querySelectorAll('[data-edit-dummy="1"]'));
    while (existing.length > neededCount) {
      const node = existing.pop();
      if (node && node.parentNode === lane) {
        lane.removeChild(node);
      }
    }

    while (existing.length < neededCount) {
      const nextIndex = realCount + existing.length + 1;
      const row = createEditDummyRow(nextIndex);
      lane.appendChild(row);
      existing.push(row);
    }

    const renderer = getRendererApi();
    if (renderer) {
      renderer.updateRows(existing);
    }

    for (const row of existing) {
      applyEditDummyVisual(row);
      if (row.parentNode === lane) {
        lane.appendChild(row);
      }
    }
  }

  function restoreVisibleMessagesFromHistory() {
    if (!state.isActive) {
      return;
    }

    const lane = state.overlayUI.lane;
    if (!lane) {
      return;
    }

    const profile = getCurrentModeProfile();
    const targetIds = state.messageHistoryOrder.slice(-Math.max(1, profile.maxVisible));

    for (const messageId of [...state.messageOrder]) {
      removeMessageNode(messageId, true);
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

      lane.appendChild(node);
      nextOrder.push(messageId);
      clearMessageTimer(messageId);
      const timer = window.setTimeout(() => {
        enqueueExpiredMessage(messageId);
      }, getCurrentModeProfile().ttlMs);
      state.activeTimers.set(messageId, timer);
    }

    state.messageOrder = nextOrder;
    syncEditDummyRows();
    syncDragOverlayLayout();
  }

  function revealHistoryDuringDrag() {
    if (!state.dragState.active || !state.isActive || state.dragState.editModeEnabled) {
      return;
    }

    const lane = state.overlayUI.lane;
    if (!lane) {
      return;
    }

    const profile = getCurrentModeProfile();
    const targetIds = state.messageHistoryOrder.slice(-Math.max(1, profile.maxVisible));
    if (targetIds.length === 0) {
      syncEditDummyRows();
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
    syncEditDummyRows();
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
    syncEditDummyRows();
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

  function updateExistingRowStyles() {
    const renderer = getRendererApi();
    if (!renderer) {
      return;
    }
    renderer.updateRows(state.messageNodes.values());
    syncEditDummyRows();
    syncDragOverlayLayout();
  }

  function createMessageRow(message) {
    const renderer = getRendererApi();
    if (!renderer) {
      return document.createElement("div");
    }
    return renderer.createMessageRow(message);
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
