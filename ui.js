(() => {
  if (window.top !== window) {
    return;
  }

  function create(deps) {
    const state = deps && deps.state ? deps.state : {};
    const overlayRootId = deps && deps.overlayRootId ? deps.overlayRootId : "yt-chat-overlay-root";
    const overlayLaneId = deps && deps.overlayLaneId ? deps.overlayLaneId : "yt-chat-overlay-lane";
    const offsetMaxXBase =
      deps && typeof deps.offsetMaxXBase === "number" ? deps.offsetMaxXBase : 1920;
    const offsetMaxYBase =
      deps && typeof deps.offsetMaxYBase === "number" ? deps.offsetMaxYBase : 1080;

    const clampNumber =
      deps && typeof deps.clampNumber === "function"
        ? deps.clampNumber
        : (value, min, max, fallback) => {
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
          };

    const getPlayerHost =
      deps && typeof deps.getPlayerHost === "function" ? deps.getPlayerHost : () => null;
    const getCurrentModeProfile =
      deps && typeof deps.getCurrentModeProfile === "function"
        ? deps.getCurrentModeProfile
        : () => ({
            maxVisible: 8,
            laneWidthPercent: 44,
            rowGapPx: 10,
            fontSizePx: 22,
            avatarSizePx: 44,
            showAvatar: true,
            horizontalAlign: "left",
            verticalAlign: "bottom",
            offsetXPx: 0,
            offsetYPx: 0
          });
    const getModeProfile =
      deps && typeof deps.getModeProfile === "function"
        ? deps.getModeProfile
        : () => getCurrentModeProfile();
    const getCurrentDisplayMode =
      deps && typeof deps.getCurrentDisplayMode === "function"
        ? deps.getCurrentDisplayMode
        : () => "fullscreen";
    const getCurrentChatPanelState =
      deps && typeof deps.getCurrentChatPanelState === "function"
        ? deps.getCurrentChatPanelState
        : () => "closed";

    const queueConfigSave =
      deps && typeof deps.queueConfigSave === "function" ? deps.queueConfigSave : () => {};
    const clearMessageTimer =
      deps && typeof deps.clearMessageTimer === "function" ? deps.clearMessageTimer : () => {};
    const removeMessageNode =
      deps && typeof deps.removeMessageNode === "function" ? deps.removeMessageNode : () => {};
    const restoreVisibleMessagesFromHistory =
      deps && typeof deps.restoreVisibleMessagesFromHistory === "function"
        ? deps.restoreVisibleMessagesFromHistory
        : () => {};
    const syncEditDummyRows =
      deps && typeof deps.syncEditDummyRows === "function" ? deps.syncEditDummyRows : () => {};
    const triggerSequentialFadeOutForVisibleMessages =
      deps && typeof deps.triggerSequentialFadeOutForVisibleMessages === "function"
        ? deps.triggerSequentialFadeOutForVisibleMessages
        : () => {};
    const revealHistoryDuringDrag =
      deps && typeof deps.revealHistoryDuringDrag === "function"
        ? deps.revealHistoryDuringDrag
        : () => {};

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

    function getProfileOffsetXPx(profile) {
      const side = profile.horizontalAlign === "right" ? "right" : "left";
      const fallback = Math.round(clampNumber(profile.offsetXPx, 0, offsetMaxXBase, 0));
      const map =
        profile.offsetsByAnchorX && typeof profile.offsetsByAnchorX === "object"
          ? profile.offsetsByAnchorX
          : {};
      return Math.round(clampNumber(map[side], 0, offsetMaxXBase, fallback));
    }

    function getProfileOffsetYPx(profile) {
      const side = profile.verticalAlign === "top" ? "top" : "bottom";
      const fallback = Math.round(clampNumber(profile.offsetYPx, 0, offsetMaxYBase, 0));
      const map =
        profile.offsetsByAnchorY && typeof profile.offsetsByAnchorY === "object"
          ? profile.offsetsByAnchorY
          : {};
      return Math.round(clampNumber(map[side], 0, offsetMaxYBase, fallback));
    }

    function setProfileOffsetXPx(profile, value) {
      const side = profile.horizontalAlign === "right" ? "right" : "left";
      const next = Math.round(clampNumber(value, 0, offsetMaxXBase, 0));
      const map =
        profile.offsetsByAnchorX && typeof profile.offsetsByAnchorX === "object"
          ? profile.offsetsByAnchorX
          : {};
      map[side] = next;
      if (typeof map.left !== "number") {
        map.left = next;
      }
      if (typeof map.right !== "number") {
        map.right = next;
      }
      profile.offsetsByAnchorX = map;
      profile.offsetXPx = next;
    }

    function setProfileOffsetYPx(profile, value) {
      const side = profile.verticalAlign === "top" ? "top" : "bottom";
      const next = Math.round(clampNumber(value, 0, offsetMaxYBase, 0));
      const map =
        profile.offsetsByAnchorY && typeof profile.offsetsByAnchorY === "object"
          ? profile.offsetsByAnchorY
          : {};
      map[side] = next;
      if (typeof map.top !== "number") {
        map.top = next;
      }
      if (typeof map.bottom !== "number") {
        map.bottom = next;
      }
      profile.offsetsByAnchorY = map;
      profile.offsetYPx = next;
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
        const currentOffsetX = getProfileOffsetXPx(profile);
        const currentOffsetY = getProfileOffsetYPx(profile);
        return {
          offsetXBase: Math.round(clampNumber(currentOffsetX, 0, offsetMaxXBase, currentOffsetX)),
          offsetYBase: Math.round(clampNumber(currentOffsetY, 0, offsetMaxYBase, currentOffsetY)),
          maxXBase: offsetMaxXBase,
          maxYBase: offsetMaxYBase,
          size: null
        };
      }

      const maxXBase = toBaseOffsetLimit(size.hostRect.width, size.width, 1920, offsetMaxXBase);
      const maxYBase = toBaseOffsetLimit(size.hostRect.height, size.height, 1080, offsetMaxYBase);

      return {
        offsetXBase: Math.round(clampNumber(getProfileOffsetXPx(profile), 0, maxXBase, 0)),
        offsetYBase: Math.round(clampNumber(getProfileOffsetYPx(profile), 0, maxYBase, 0)),
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

    function updateSettingsButtonVisualState() {
      const button = state.overlayUI.settingsButton;
      if (!button) {
        return;
      }
      const visible = Boolean(state.overlayUI.settingsWindowVisible);
      button.setAttribute("aria-pressed", visible ? "true" : "false");
      button.textContent = visible ? "設定中" : "設定";
      button.style.color = visible ? "#ffd369" : "#ffffff";
      button.style.textShadow = visible
        ? "0 0 8px rgba(255, 211, 105, 0.55)"
        : "0 0 6px rgba(0, 0, 0, 0.45)";
    }

    function getSettingsPageUrl() {
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === "function"
      ) {
        return chrome.runtime.getURL("popup.html");
      }
      return "";
    }

    const SETTINGS_WINDOW_MARGIN = 12;
    const settingsWindowDrag = {
      active: false,
      pointerId: null,
      startClientX: 0,
      startClientY: 0,
      startLeft: 0,
      startTop: 0
    };

    function clampSettingsWindowPosition(left, top, width, height, hostWidth, hostHeight) {
      const allowMarginX = hostWidth >= width + SETTINGS_WINDOW_MARGIN * 2;
      const allowMarginY = hostHeight >= height + SETTINGS_WINDOW_MARGIN * 2;
      const minLeft = allowMarginX ? SETTINGS_WINDOW_MARGIN : 0;
      const minTop = allowMarginY ? SETTINGS_WINDOW_MARGIN : 0;
      const maxLeft = allowMarginX
        ? hostWidth - width - SETTINGS_WINDOW_MARGIN
        : Math.max(0, hostWidth - width);
      const maxTop = allowMarginY
        ? hostHeight - height - SETTINGS_WINDOW_MARGIN
        : Math.max(0, hostHeight - height);

      return {
        left: Math.round(clampNumber(left, minLeft, maxLeft, minLeft)),
        top: Math.round(clampNumber(top, minTop, maxTop, minTop))
      };
    }

    function getSettingsWindowSize(host) {
      const hostWidth = Math.max(0, host.clientWidth);
      const hostHeight = Math.max(0, host.clientHeight);
      const width = Math.round(
        Math.min(460, Math.max(260, hostWidth - SETTINGS_WINDOW_MARGIN * 2))
      );
      const height = Math.round(
        Math.min(760, Math.max(300, hostHeight - SETTINGS_WINDOW_MARGIN * 2))
      );
      return {
        hostWidth,
        hostHeight,
        width: Math.min(width, hostWidth),
        height: Math.min(height, hostHeight)
      };
    }

    function saveSettingsWindowPosition(left, top) {
      state.overlayUI.settingsWindowPosition = {
        leftPx: Math.round(left),
        topPx: Math.round(top)
      };
    }

    function endSettingsWindowDrag() {
      if (!settingsWindowDrag.active) {
        const header = state.overlayUI.settingsWindowHeader;
        if (header) {
          header.style.cursor = "grab";
        }
        return;
      }

      const header = state.overlayUI.settingsWindowHeader;
      if (header && typeof settingsWindowDrag.pointerId === "number") {
        try {
          if (header.hasPointerCapture(settingsWindowDrag.pointerId)) {
            header.releasePointerCapture(settingsWindowDrag.pointerId);
          }
        } catch (_error) {
          // Ignore capture release failures caused by host/UI changes.
        }
      }

      settingsWindowDrag.active = false;
      settingsWindowDrag.pointerId = null;
      if (header) {
        header.style.cursor = "grab";
      }
    }

    function onSettingsWindowHeaderPointerDown(event) {
      if (!(event instanceof PointerEvent)) {
        return;
      }
      if (event.button !== 0) {
        return;
      }

      const header = state.overlayUI.settingsWindowHeader;
      const windowNode = state.overlayUI.settingsWindow;
      const host = state.overlayUI.host;
      if (
        !(header instanceof HTMLElement) ||
        !(windowNode instanceof HTMLElement) ||
        !(host instanceof HTMLElement)
      ) {
        return;
      }
      if (!state.overlayUI.settingsWindowVisible) {
        return;
      }
      if (
        state.overlayUI.settingsCloseButton &&
        event.target instanceof Node &&
        state.overlayUI.settingsCloseButton.contains(event.target)
      ) {
        return;
      }

      const leftFromStyle = Number.parseFloat(windowNode.style.left);
      const topFromStyle = Number.parseFloat(windowNode.style.top);
      settingsWindowDrag.active = true;
      settingsWindowDrag.pointerId = event.pointerId;
      settingsWindowDrag.startClientX = event.clientX;
      settingsWindowDrag.startClientY = event.clientY;
      settingsWindowDrag.startLeft = Number.isFinite(leftFromStyle)
        ? leftFromStyle
        : windowNode.offsetLeft;
      settingsWindowDrag.startTop = Number.isFinite(topFromStyle)
        ? topFromStyle
        : windowNode.offsetTop;

      try {
        header.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Ignore pointer capture failures on host-controlled UIs.
      }

      header.style.cursor = "grabbing";
      event.preventDefault();
      event.stopPropagation();
    }

    function onSettingsWindowHeaderPointerMove(event) {
      if (!(event instanceof PointerEvent)) {
        return;
      }
      if (!settingsWindowDrag.active || event.pointerId !== settingsWindowDrag.pointerId) {
        return;
      }

      const windowNode = state.overlayUI.settingsWindow;
      const host = state.overlayUI.host;
      if (!(windowNode instanceof HTMLElement) || !(host instanceof HTMLElement)) {
        endSettingsWindowDrag();
        return;
      }

      const hostWidth = Math.max(0, host.clientWidth);
      const hostHeight = Math.max(0, host.clientHeight);
      const width = Math.max(0, windowNode.offsetWidth);
      const height = Math.max(0, windowNode.offsetHeight);
      const deltaX = event.clientX - settingsWindowDrag.startClientX;
      const deltaY = event.clientY - settingsWindowDrag.startClientY;
      const nextLeft = settingsWindowDrag.startLeft + deltaX;
      const nextTop = settingsWindowDrag.startTop + deltaY;
      const clamped = clampSettingsWindowPosition(
        nextLeft,
        nextTop,
        width,
        height,
        hostWidth,
        hostHeight
      );

      windowNode.style.left = `${clamped.left}px`;
      windowNode.style.top = `${clamped.top}px`;
      windowNode.style.right = "";
      windowNode.style.bottom = "";
      saveSettingsWindowPosition(clamped.left, clamped.top);

      event.preventDefault();
      event.stopPropagation();
    }

    function onSettingsWindowHeaderPointerUp(event) {
      if (!(event instanceof PointerEvent)) {
        endSettingsWindowDrag();
        return;
      }
      if (!settingsWindowDrag.active || event.pointerId !== settingsWindowDrag.pointerId) {
        return;
      }

      endSettingsWindowDrag();
      event.preventDefault();
      event.stopPropagation();
    }

    function onSettingsWindowHeaderPointerCancel(event) {
      if (!(event instanceof PointerEvent)) {
        endSettingsWindowDrag();
        return;
      }
      if (!settingsWindowDrag.active || event.pointerId !== settingsWindowDrag.pointerId) {
        return;
      }

      endSettingsWindowDrag();
      event.preventDefault();
      event.stopPropagation();
    }

    function syncSettingsWindowState() {
      const host = state.overlayUI.host;
      const windowNode = state.overlayUI.settingsWindow;
      if (!(host instanceof HTMLElement) || !(windowNode instanceof HTMLElement)) {
        updateSettingsButtonVisualState();
        return;
      }

      const visible = Boolean(state.overlayUI.settingsWindowVisible);
      if (!visible) {
        endSettingsWindowDrag();
        windowNode.style.display = "none";
        updateSettingsButtonVisualState();
        return;
      }

      const size = getSettingsWindowSize(host);
      const hostWidth = size.hostWidth;
      const hostHeight = size.hostHeight;
      const width = size.width;
      const height = size.height;
      if (hostWidth <= 0 || hostHeight <= 0 || width <= 0 || height <= 0) {
        windowNode.style.display = "none";
        updateSettingsButtonVisualState();
        return;
      }

      const allowMarginX = hostWidth >= width + SETTINGS_WINDOW_MARGIN * 2;
      const allowMarginY = hostHeight >= height + SETTINGS_WINDOW_MARGIN * 2;
      const defaultLeft = allowMarginX ? hostWidth - width - SETTINGS_WINDOW_MARGIN : 0;
      const defaultTop = allowMarginY ? SETTINGS_WINDOW_MARGIN : 0;
      const saved =
        state.overlayUI.settingsWindowPosition &&
        typeof state.overlayUI.settingsWindowPosition === "object"
          ? state.overlayUI.settingsWindowPosition
          : {};
      const requestedLeft =
        saved && Number.isFinite(saved.leftPx) ? saved.leftPx : Math.round(defaultLeft);
      const requestedTop =
        saved && Number.isFinite(saved.topPx) ? saved.topPx : Math.round(defaultTop);
      const position = clampSettingsWindowPosition(
        requestedLeft,
        requestedTop,
        width,
        height,
        hostWidth,
        hostHeight
      );

      windowNode.style.display = "flex";
      windowNode.style.width = `${Math.round(width)}px`;
      windowNode.style.height = `${Math.round(height)}px`;
      windowNode.style.left = `${position.left}px`;
      windowNode.style.top = `${position.top}px`;
      windowNode.style.right = "";
      windowNode.style.bottom = "";
      saveSettingsWindowPosition(position.left, position.top);

      updateSettingsButtonVisualState();
    }

    function setSettingsWindowVisible(visible) {
      if (!visible) {
        endSettingsWindowDrag();
      }
      state.overlayUI.settingsWindowVisible = Boolean(visible);
      syncSettingsWindowState();
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
      updateSettingsButtonVisualState();
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
        setSettingsWindowVisible(false);
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
      state.dragState.startOffsetXPx = getProfileOffsetXPx(profile);
      state.dragState.startOffsetYPx = getProfileOffsetYPx(profile);

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
      setProfileOffsetXPx(profile, clampNumber(nextOffsetX, 0, bounds.maxXBase, bounds.offsetXBase));
      setProfileOffsetYPx(profile, clampNumber(nextOffsetY, 0, bounds.maxYBase, bounds.offsetYBase));

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
      lane.style.alignItems = profile.horizontalAlign === "right" ? "flex-end" : "flex-start";
      lane.style.gap = `${Math.max(0, Math.round(profile.rowGapPx))}px`;
      syncDragOverlayLayout();
      syncSettingsWindowState();
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

    function onSettingsButtonClick(event) {
      if (event instanceof Event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (!state.isActive) {
        return;
      }

      setSettingsWindowVisible(!state.overlayUI.settingsWindowVisible);
    }

    function isEditUiEventTarget(target) {
      if (!(target instanceof Element)) {
        return false;
      }

      return Boolean(
        target.closest("#yt-chat-overlay-edit-button") ||
          target.closest("#yt-chat-overlay-settings-button") ||
          target.closest("#yt-chat-overlay-settings-window") ||
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
      let settingsButton = state.overlayUI.settingsButton;
      let settingsWindow = state.overlayUI.settingsWindow;
      let settingsWindowHeader = state.overlayUI.settingsWindowHeader;
      let settingsIframe = state.overlayUI.settingsIframe;
      let settingsCloseButton = state.overlayUI.settingsCloseButton;

      if (!root) {
        root = document.createElement("div");
        root.id = overlayRootId;
        root.style.position = "absolute";
        root.style.inset = "0";
        root.style.pointerEvents = "none";
        root.style.zIndex = "2147483647";
        root.style.overflow = "hidden";

        lane = document.createElement("div");
        lane.id = overlayLaneId;
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

        settingsButton = document.createElement("button");
        settingsButton.id = "yt-chat-overlay-settings-button";
        settingsButton.type = "button";
        settingsButton.className = "ytp-button";
        settingsButton.setAttribute("aria-label", "オーバーレイ設定");
        settingsButton.style.width = "auto";
        settingsButton.style.minWidth = "52px";
        settingsButton.style.padding = "0 10px";
        settingsButton.style.fontSize = "14px";
        settingsButton.style.fontWeight = "700";
        settingsButton.style.letterSpacing = "0.02em";
        settingsButton.style.lineHeight = "36px";
        settingsButton.style.position = "relative";
        settingsButton.style.zIndex = "2";
        settingsButton.style.pointerEvents = "auto";
        settingsButton.style.userSelect = "none";
        settingsButton.style.textShadow = "0 0 6px rgba(0, 0, 0, 0.45)";
        settingsButton.style.color = "#ffffff";
        settingsButton.textContent = "設定";
        settingsButton.addEventListener("click", onSettingsButtonClick);
        settingsButton.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
        });

        settingsWindow = document.createElement("div");
        settingsWindow.id = "yt-chat-overlay-settings-window";
        settingsWindow.style.position = "absolute";
        settingsWindow.style.display = "none";
        settingsWindow.style.flexDirection = "column";
        settingsWindow.style.pointerEvents = "auto";
        settingsWindow.style.zIndex = "2147483647";
        settingsWindow.style.background = "rgba(9, 12, 24, 0.92)";
        settingsWindow.style.border = "1px solid rgba(255, 255, 255, 0.2)";
        settingsWindow.style.borderRadius = "12px";
        settingsWindow.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.55)";
        settingsWindow.style.overflow = "hidden";
        settingsWindow.style.backdropFilter = "blur(6px)";
        settingsWindow.style.webkitBackdropFilter = "blur(6px)";

        settingsWindowHeader = document.createElement("div");
        settingsWindowHeader.style.height = "36px";
        settingsWindowHeader.style.display = "flex";
        settingsWindowHeader.style.alignItems = "center";
        settingsWindowHeader.style.justifyContent = "space-between";
        settingsWindowHeader.style.padding = "0 10px";
        settingsWindowHeader.style.background = "rgba(255, 255, 255, 0.08)";
        settingsWindowHeader.style.borderBottom = "1px solid rgba(255, 255, 255, 0.15)";
        settingsWindowHeader.style.color = "#ffffff";
        settingsWindowHeader.style.fontSize = "12px";
        settingsWindowHeader.style.fontWeight = "700";
        settingsWindowHeader.style.letterSpacing = "0.02em";
        settingsWindowHeader.style.cursor = "grab";
        settingsWindowHeader.style.userSelect = "none";
        settingsWindowHeader.style.touchAction = "none";
        settingsWindowHeader.addEventListener("pointerdown", onSettingsWindowHeaderPointerDown);
        settingsWindowHeader.addEventListener("pointermove", onSettingsWindowHeaderPointerMove);
        settingsWindowHeader.addEventListener("pointerup", onSettingsWindowHeaderPointerUp);
        settingsWindowHeader.addEventListener("pointercancel", onSettingsWindowHeaderPointerCancel);
        settingsWindowHeader.addEventListener("lostpointercapture", endSettingsWindowDrag);
        settingsWindowHeader.addEventListener("dragstart", (event) => event.preventDefault());

        const title = document.createElement("span");
        title.textContent = "Overlay設定";
        settingsWindowHeader.appendChild(title);

        settingsCloseButton = document.createElement("button");
        settingsCloseButton.type = "button";
        settingsCloseButton.textContent = "×";
        settingsCloseButton.setAttribute("aria-label", "設定ウィンドウを閉じる");
        settingsCloseButton.style.width = "28px";
        settingsCloseButton.style.height = "28px";
        settingsCloseButton.style.border = "none";
        settingsCloseButton.style.borderRadius = "8px";
        settingsCloseButton.style.background = "rgba(255, 255, 255, 0.15)";
        settingsCloseButton.style.color = "#ffffff";
        settingsCloseButton.style.cursor = "pointer";
        settingsCloseButton.style.fontSize = "16px";
        settingsCloseButton.style.lineHeight = "1";
        settingsCloseButton.style.padding = "0";
        settingsCloseButton.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
        });
        settingsCloseButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setSettingsWindowVisible(false);
        });
        settingsWindowHeader.appendChild(settingsCloseButton);

        const frameWrap = document.createElement("div");
        frameWrap.style.flex = "1 1 auto";
        frameWrap.style.minHeight = "0";
        frameWrap.style.background = "#0b1020";

        settingsIframe = document.createElement("iframe");
        settingsIframe.id = "yt-chat-overlay-settings-frame";
        settingsIframe.style.width = "100%";
        settingsIframe.style.height = "100%";
        settingsIframe.style.border = "0";
        settingsIframe.style.display = "block";
        settingsIframe.style.background = "transparent";
        const settingsPageUrl = getSettingsPageUrl();
        if (settingsPageUrl) {
          settingsIframe.src = settingsPageUrl;
        }
        frameWrap.appendChild(settingsIframe);

        settingsWindow.appendChild(settingsWindowHeader);
        settingsWindow.appendChild(frameWrap);

        const stopPlayerPropagation = (event) => {
          event.stopPropagation();
        };
        settingsWindow.addEventListener("pointerdown", stopPlayerPropagation);
        settingsWindow.addEventListener("click", stopPlayerPropagation);
        settingsWindow.addEventListener("dblclick", stopPlayerPropagation);
        settingsWindow.addEventListener("touchstart", stopPlayerPropagation);
        settingsWindow.addEventListener("touchend", stopPlayerPropagation);
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
        if (
          state.overlayUI.controlsHost &&
          settingsButton &&
          settingsButton.parentNode === state.overlayUI.controlsHost
        ) {
          state.overlayUI.controlsHost.removeChild(settingsButton);
        }
        if (
          state.overlayUI.host &&
          settingsWindow &&
          settingsWindow.parentNode === state.overlayUI.host
        ) {
          state.overlayUI.host.removeChild(settingsWindow);
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
        if (settingsWindow) {
          host.appendChild(settingsWindow);
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
        if (settingsWindow && settingsWindow.parentNode !== host) {
          host.appendChild(settingsWindow);
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
      if (
        state.overlayUI.controlsHost &&
        state.overlayUI.controlsHost !== controlsHost &&
        settingsButton &&
        settingsButton.parentNode === state.overlayUI.controlsHost
      ) {
        state.overlayUI.controlsHost.removeChild(settingsButton);
      }
      if (controlsHost && editButton && editButton.parentNode !== controlsHost) {
        controlsHost.appendChild(editButton);
      }
      if (controlsHost && settingsButton && settingsButton.parentNode !== controlsHost) {
        controlsHost.appendChild(settingsButton);
      }

      state.overlayUI.root = root;
      state.overlayUI.lane = lane;
      state.overlayUI.dragHandle = dragHandle;
      state.overlayUI.dragFrame = dragFrame;
      state.overlayUI.editButton = editButton;
      state.overlayUI.settingsButton = settingsButton;
      state.overlayUI.settingsWindow = settingsWindow;
      state.overlayUI.settingsWindowHeader = settingsWindowHeader;
      state.overlayUI.settingsIframe = settingsIframe;
      state.overlayUI.settingsCloseButton = settingsCloseButton;
      state.overlayUI.controlsHost = controlsHost || null;
      syncEditModeUiState();
      syncSettingsWindowState();
      applyOverlayLayoutStyles();
      syncEditDummyRows();
    }

    function removeOverlayUI() {
      endOffsetDrag();
      setSettingsWindowVisible(false);
      setEditModeEnabled(false);
      unbindPlayerInteractionBlocker();

      const {
        root,
        host,
        hostOriginalPosition,
        dragHandle,
        dragFrame,
        editButton,
        settingsButton,
        settingsWindow,
        settingsWindowHeader,
        settingsIframe,
        settingsCloseButton,
        controlsHost
      } =
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
      if (settingsButton && controlsHost && settingsButton.parentNode === controlsHost) {
        controlsHost.removeChild(settingsButton);
      }
      if (settingsWindow && host && settingsWindow.parentNode === host) {
        host.removeChild(settingsWindow);
      }
      if (host && hostOriginalPosition !== null) {
        host.style.position = hostOriginalPosition;
      }

      state.overlayUI.root = null;
      state.overlayUI.lane = null;
      state.overlayUI.dragHandle = null;
      state.overlayUI.dragFrame = null;
      state.overlayUI.editButton = null;
      state.overlayUI.settingsButton = null;
      state.overlayUI.settingsWindow = null;
      state.overlayUI.settingsWindowHeader = null;
      state.overlayUI.settingsIframe = null;
      state.overlayUI.settingsCloseButton = null;
      state.overlayUI.settingsWindowVisible = false;
      state.overlayUI.controlsHost = null;
      state.overlayUI.blockHost = null;
      state.overlayUI.host = null;
      state.overlayUI.hostOriginalPosition = null;
    }

    return {
      syncDragOverlayLayout,
      setEditModeEnabled,
      endOffsetDrag,
      applyOverlayLayoutStyles,
      ensureOverlayUI,
      removeOverlayUI
    };
  }

  window.YTChatOverlayUi = {
    create
  };
})();
