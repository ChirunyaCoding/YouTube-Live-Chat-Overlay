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
   * @property {boolean} isMember
   * @property {number} timestampMs
   * @property {string} accentColor
   * @property {number} priority
   */

  /**
   * @typedef {Object} OverlayModeProfile
   * @property {number} maxVisible
   * @property {"timer"|"overflow"} fadeOutTrigger
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
   * @property {"left"|"right"} identityAlign
   * @property {{left: number, right: number}} offsetsByAnchorX
   * @property {{top: number, bottom: number}} offsetsByAnchorY
   * @property {number} offsetXPx
   * @property {number} offsetYPx
   * @property {number} strokePx
   * @property {number} textOpacity
   * @property {number} messageBgOpacity
   * @property {boolean} showAvatar
   * @property {boolean} showAuthorName
   * @property {string} authorNameColorMember
   * @property {string} authorNameColorNonMember
   * @property {string} commentTextColor
   */

  /**
   * @typedef {Object} OverlayConfig
   * @property {{fullscreen: boolean, theater: boolean, normal: boolean}} enabledModes
   * @property {{fontSizePx: boolean, rowGapPx: boolean, laneWidthPercent: boolean, fontWeight: boolean, avatarSizePx: boolean, strokePx: boolean, textOpacity: boolean, messageBgOpacity: boolean, anchorSettings: boolean}} sharedProfileFields
   * @property {{fullscreen: OverlayModeProfile, theater: OverlayModeProfile, normal: OverlayModeProfile}} modeProfiles
   * @property {{open: {fullscreen: OverlayModeProfile, theater: OverlayModeProfile, normal: OverlayModeProfile}, closed: {fullscreen: OverlayModeProfile, theater: OverlayModeProfile, normal: OverlayModeProfile}}} panelModeProfiles
   * @property {number} maxVisible
   * @property {"timer"|"overflow"} fadeOutTrigger
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
   * @property {"left"|"right"} identityAlign
   * @property {{left: number, right: number}} offsetsByAnchorX
   * @property {{top: number, bottom: number}} offsetsByAnchorY
   * @property {number} offsetXPx
   * @property {number} offsetYPx
   * @property {number} strokePx
   * @property {number} textOpacity
   * @property {number} messageBgOpacity
   * @property {boolean} showAvatar
   * @property {boolean} showAuthorName
   * @property {string} authorNameColorMember
   * @property {string} authorNameColorNonMember
   * @property {string} commentTextColor
   */

  const configApi =
    typeof window !== "undefined" ? window.YTChatOverlayConfig : null;
  if (!configApi) {
    console.error("[yt-chat-overlay] config module is missing.");
    return;
  }

  const domApi = typeof window !== "undefined" ? window.YTChatOverlayDom : null;
  if (!domApi) {
    console.error("[yt-chat-overlay] dom module is missing.");
    return;
  }

  const chatSourceNamespace =
    typeof window !== "undefined" ? window.YTChatOverlayChatSource : null;
  if (!chatSourceNamespace || typeof chatSourceNamespace.create !== "function") {
    console.error("[yt-chat-overlay] chat source module is missing.");
    return;
  }

  const messageFlowNamespace =
    typeof window !== "undefined" ? window.YTChatOverlayMessageFlow : null;
  if (!messageFlowNamespace || typeof messageFlowNamespace.create !== "function") {
    console.error("[yt-chat-overlay] message flow module is missing.");
    return;
  }

  const overlayUiNamespace = typeof window !== "undefined" ? window.YTChatOverlayUi : null;
  if (!overlayUiNamespace || typeof overlayUiNamespace.create !== "function") {
    console.error("[yt-chat-overlay] overlay ui module is missing.");
    return;
  }

  const {
    STORAGE_KEY,
    MODE_KEYS,
    PANEL_STATE_KEYS,
    EDIT_DUMMY_ID_PREFIX,
    OFFSET_MAX_X_BASE,
    OFFSET_MAX_Y_BASE,
    DEFAULT_CONFIG,
    OVERLAY_ROOT_ID,
    OVERLAY_LANE_ID,
    RENDERER_SELECTOR,
    TYPE_INFO,
    clampNumber,
    normalizeConfig
  } = configApi;

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
      settingsButton: null,
      settingsWindow: null,
      settingsWindowHeader: null,
      settingsIframe: null,
      settingsCloseButton: null,
      settingsWindowVisible: false,
      settingsWindowPosition: {
        leftPx: null,
        topPx: null
      },
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
    syncRaf: 0,
    storageSnapshot: "null",
    storageSyncTimer: 0
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

  const chatSourceApi = chatSourceNamespace.create({
    state,
    rendererSelector: RENDERER_SELECTOR,
    getParserApi,
    getCurrentModeProfile,
    enqueueMessage: (message) => enqueueMessage(message),
    scheduleSync: () => scheduleSync(),
    findChatContainer: domApi.findChatContainer,
    findChatIframe: domApi.findChatIframe,
    isChatContainerCollapsed: domApi.isChatContainerCollapsed,
    isElementVisiblyDisplayed: domApi.isElementVisiblyDisplayed,
    getCurrentVideoId: domApi.getCurrentVideoId,
    getHiddenChatUrls: domApi.getHiddenChatUrls
  });

  const messageFlowApi = messageFlowNamespace.create({
    state,
    editDummyIdPrefix: EDIT_DUMMY_ID_PREFIX,
    getCurrentModeProfile,
    getRendererApi,
    ensureOverlayUI: () => ensureOverlayUI(),
    syncDragOverlayLayout: () => syncDragOverlayLayout()
  });

  const overlayUiApi = overlayUiNamespace.create({
    state,
    overlayRootId: OVERLAY_ROOT_ID,
    overlayLaneId: OVERLAY_LANE_ID,
    offsetMaxXBase: OFFSET_MAX_X_BASE,
    offsetMaxYBase: OFFSET_MAX_Y_BASE,
    clampNumber,
    getPlayerHost: () => getPlayerHost(),
    getCurrentModeProfile: () => getCurrentModeProfile(),
    getModeProfile: (mode, panelState) => getModeProfile(mode, panelState),
    getCurrentDisplayMode: () => getCurrentDisplayMode(),
    getCurrentChatPanelState: () => getCurrentChatPanelState(),
    queueConfigSave: (delayMs) => queueConfigSave(delayMs),
    clearMessageTimer: (messageId) => clearMessageTimer(messageId),
    removeMessageNode: (messageId, immediate) => removeMessageNode(messageId, immediate),
    restoreVisibleMessagesFromHistory: () => restoreVisibleMessagesFromHistory(),
    syncEditDummyRows: () => syncEditDummyRows(),
    triggerSequentialFadeOutForVisibleMessages: () =>
      triggerSequentialFadeOutForVisibleMessages(),
    revealHistoryDuringDrag: () => revealHistoryDuringDrag()
  });

  function getStorageArea() {
    if (typeof chrome === "undefined") {
      return null;
    }
    if (!chrome.storage || !chrome.storage.local) {
      return null;
    }
    return chrome.storage.local;
  }

  function serializeStorageValue(value) {
    try {
      return JSON.stringify(typeof value === "undefined" ? null : value);
    } catch (_error) {
      return "null";
    }
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
        const rawConfig = result ? result[STORAGE_KEY] : null;
        state.storageSnapshot = serializeStorageValue(rawConfig);
        state.config = normalizeConfig(rawConfig);
        resolve();
      });
    });
  }

  function syncConfigFromStorageIfNeeded(forceApply) {
    const storage = getStorageArea();
    if (!storage) {
      return;
    }

    try {
      storage.get([STORAGE_KEY], (result) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          return;
        }
        const rawConfig = result ? result[STORAGE_KEY] : null;
        const nextSnapshot = serializeStorageValue(rawConfig);
        if (!forceApply && nextSnapshot === state.storageSnapshot) {
          return;
        }
        state.storageSnapshot = nextSnapshot;
        state.config = normalizeConfig(rawConfig);
        applyConfigChange();
      });
    } catch (e) {
      // Extension context invalidated - ignore
    }
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

    try {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") {
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
          return;
        }

        const change = changes[STORAGE_KEY];
        state.storageSnapshot = serializeStorageValue(change ? change.newValue : null);
        state.config = normalizeConfig(change ? change.newValue : null);
        applyConfigChange();
      });
    } catch (e) {
      // Extension context invalidated - ignore
    }
  }

  function startStorageFallbackSync() {
    const storage = getStorageArea();
    if (!storage || state.storageSyncTimer) {
      return;
    }

    // Fallback path for environments where onChanged events are delayed or missed.
    state.storageSyncTimer = window.setInterval(() => {
      syncConfigFromStorageIfNeeded(false);
    }, 1200);
  }

  function isFullscreenActive() {
    return domApi.isFullscreenActive();
  }

  function isTheaterActive() {
    return domApi.isTheaterActive();
  }

  function shouldHideNativeChat() {
    return chatSourceApi.shouldHideNativeChat();
  }

  function isWatchPageActive() {
    return domApi.isWatchPageActive();
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

  function getCurrentChatPanelState() {
    return chatSourceApi.getCurrentChatPanelState();
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

  function getPlayerHost() {
    return domApi.getPlayerHost();
  }

  function syncDragOverlayLayout() {
    overlayUiApi.syncDragOverlayLayout();
  }

  function setEditModeEnabled(enabled) {
    overlayUiApi.setEditModeEnabled(enabled);
  }

  function endOffsetDrag() {
    overlayUiApi.endOffsetDrag();
  }

  function applyOverlayLayoutStyles() {
    overlayUiApi.applyOverlayLayoutStyles();
  }

  function ensureOverlayUI() {
    overlayUiApi.ensureOverlayUI();
  }

  function removeOverlayUI() {
    overlayUiApi.removeOverlayUI();
  }

  function hideNativeChat() {
    chatSourceApi.hideNativeChat();
  }

  function restoreNativeChat() {
    chatSourceApi.restoreNativeChat();
  }

  function removeHiddenChatIframe() {
    chatSourceApi.removeHiddenChatIframe();
  }

  function disconnectChatSource() {
    chatSourceApi.disconnectChatSource();
  }

  function connectChatSource() {
    chatSourceApi.connectChatSource();
  }

  function markSeenId(id) {
    messageFlowApi.markSeenId(id);
  }

  function enqueueMessage(message) {
    messageFlowApi.enqueueMessage(message);
  }

  function syncEditDummyRows() {
    messageFlowApi.syncEditDummyRows();
  }

  function restoreVisibleMessagesFromHistory() {
    messageFlowApi.restoreVisibleMessagesFromHistory();
  }

  function revealHistoryDuringDrag() {
    messageFlowApi.revealHistoryDuringDrag();
  }

  function triggerSequentialFadeOutForVisibleMessages() {
    messageFlowApi.triggerSequentialFadeOutForVisibleMessages();
  }

  function enforceMaxVisible() {
    messageFlowApi.enforceMaxVisible();
  }

  function updateExistingRowStyles() {
    messageFlowApi.updateExistingRowStyles();
  }

  function clearMessageTimer(messageId) {
    messageFlowApi.clearMessageTimer(messageId);
  }

  function removeMessageNode(messageId, immediate) {
    messageFlowApi.removeMessageNode(messageId, immediate);
  }

  function clearAllMessages() {
    messageFlowApi.clearAllMessages();
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
    startStorageFallbackSync();

    loadConfigFromStorage().finally(() => {
      document.addEventListener("fullscreenchange", scheduleSync, true);
      document.addEventListener("webkitfullscreenchange", scheduleSync, true);
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.visibilityState === "visible") {
            syncConfigFromStorageIfNeeded(false);
          }
        },
        true
      );
      window.addEventListener("resize", scheduleSync, true);
      window.addEventListener(
        "focus",
        () => {
          syncConfigFromStorageIfNeeded(false);
        },
        true
      );
      window.addEventListener("yt-page-data-updated", scheduleSync, true);
      window.addEventListener("yt-navigate-finish", handleNavigation, true);

      startPageObserver();
      scheduleSync();
    });
  }

  initialize();
})();
