(() => {
  if (window.top !== window) {
    return;
  }

  function create(deps) {
    const state = deps && deps.state ? deps.state : {};
    const editDummyIdPrefix =
      deps && typeof deps.editDummyIdPrefix === "string"
        ? deps.editDummyIdPrefix
        : "__yt_edit_dummy__";
    const getCurrentModeProfile =
      deps && typeof deps.getCurrentModeProfile === "function"
        ? deps.getCurrentModeProfile
        : () => ({
            maxVisible: 8,
            fadeOutTrigger: "timer",
            ttlMs: 9000,
            fadeMs: 300,
            sequentialFadeSec: 0.3,
            fontSizePx: 22
          });
    const getRendererApi =
      deps && typeof deps.getRendererApi === "function" ? deps.getRendererApi : () => null;
    const ensureOverlayUI =
      deps && typeof deps.ensureOverlayUI === "function" ? deps.ensureOverlayUI : () => {};
    const syncDragOverlayLayout =
      deps && typeof deps.syncDragOverlayLayout === "function"
        ? deps.syncDragOverlayLayout
        : () => {};

    // When comment velocity spikes, temporarily force overflow fade mode.
    const FLOW_SURGE_WINDOW_MS = 3000;
    const FLOW_SURGE_THRESHOLD = 8;
    const FLOW_SURGE_HOLD_MS = 7000;
    const flowSurgeState = {
      arrivalTimes: [],
      forcedOverflowActive: false,
      forcedOverflowUntilMs: 0,
      releaseTimer: 0
    };

    function isOverflowFadeMode(profile) {
      const source = profile && typeof profile === "object" ? profile : getCurrentModeProfile();
      return (source && source.fadeOutTrigger === "overflow") || isForcedOverflowActive();
    }

    function isForcedOverflowActive(nowMs) {
      const now = typeof nowMs === "number" ? nowMs : Date.now();
      if (!flowSurgeState.forcedOverflowActive) {
        return false;
      }
      if (now < flowSurgeState.forcedOverflowUntilMs) {
        return true;
      }
      deactivateForcedOverflow();
      return false;
    }

    function pruneFlowArrivalHistory(nowMs) {
      const cutoff = nowMs - FLOW_SURGE_WINDOW_MS;
      while (flowSurgeState.arrivalTimes.length > 0 && flowSurgeState.arrivalTimes[0] < cutoff) {
        flowSurgeState.arrivalTimes.shift();
      }
    }

    function clearForcedOverflowReleaseTimer() {
      if (flowSurgeState.releaseTimer) {
        window.clearTimeout(flowSurgeState.releaseTimer);
        flowSurgeState.releaseTimer = 0;
      }
    }

    function scheduleForcedOverflowReleaseTimer() {
      clearForcedOverflowReleaseTimer();
      const now = Date.now();
      const remaining = flowSurgeState.forcedOverflowUntilMs - now;
      if (remaining <= 0) {
        deactivateForcedOverflow();
        return;
      }

      flowSurgeState.releaseTimer = window.setTimeout(() => {
        flowSurgeState.releaseTimer = 0;
        deactivateForcedOverflow();
      }, remaining);
    }

    function activateForcedOverflow(nowMs) {
      const nextUntil = nowMs + FLOW_SURGE_HOLD_MS;
      const wasActive = flowSurgeState.forcedOverflowActive;
      flowSurgeState.forcedOverflowActive = true;
      flowSurgeState.forcedOverflowUntilMs = Math.max(flowSurgeState.forcedOverflowUntilMs, nextUntil);
      scheduleForcedOverflowReleaseTimer();

      if (!wasActive) {
        syncFadeOutModeForVisibleMessages();
      }
    }

    function deactivateForcedOverflow() {
      if (!flowSurgeState.forcedOverflowActive) {
        clearForcedOverflowReleaseTimer();
        return;
      }

      flowSurgeState.forcedOverflowActive = false;
      flowSurgeState.forcedOverflowUntilMs = 0;
      clearForcedOverflowReleaseTimer();
      syncFadeOutModeForVisibleMessages();
    }

    function recordMessageVelocitySample() {
      const now = Date.now();
      flowSurgeState.arrivalTimes.push(now);
      pruneFlowArrivalHistory(now);
      if (flowSurgeState.arrivalTimes.length >= FLOW_SURGE_THRESHOLD) {
        activateForcedOverflow(now);
      }
    }

    function resetFlowSurgeState() {
      flowSurgeState.arrivalTimes = [];
      flowSurgeState.forcedOverflowActive = false;
      flowSurgeState.forcedOverflowUntilMs = 0;
      clearForcedOverflowReleaseTimer();
    }

    function clearExpiredQueue() {
      state.expiredMessageIds = [];
      state.expiredMessageIdSet.clear();
      if (state.expireDrainTimer) {
        window.clearTimeout(state.expireDrainTimer);
        state.expireDrainTimer = 0;
      }
    }

    function scheduleMessageTimer(messageId) {
      if (!messageId) {
        return;
      }
      if (isOverflowFadeMode()) {
        clearMessageTimer(messageId);
        return;
      }
      clearMessageTimer(messageId);
      const ttlMs = Math.max(1000, Math.round(getCurrentModeProfile().ttlMs));
      const timer = window.setTimeout(() => {
        enqueueExpiredMessage(messageId);
      }, ttlMs);
      state.activeTimers.set(messageId, timer);
    }

    function syncFadeOutModeForVisibleMessages() {
      const profile = getCurrentModeProfile();
      if (isOverflowFadeMode(profile)) {
        for (const messageId of state.messageOrder) {
          clearMessageTimer(messageId);
        }
        clearExpiredQueue();
        return;
      }

      for (const messageId of state.messageOrder) {
        if (!state.messageNodes.has(messageId)) {
          continue;
        }
        if (state.activeTimers.has(messageId)) {
          continue;
        }
        scheduleMessageTimer(messageId);
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

      recordMessageVelocitySample();
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
        id: `${editDummyIdPrefix}${state.editDummySeq}`,
        type: "engagement",
        authorName,
        authorAvatarUrl: "",
        text,
        messageRuns: [{ type: "text", text }],
        authorBadges: [],
        isMember: false,
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
          node.style.transform = "translateX(0) scale(1)";
          state.messageNodes.set(messageId, node);
        }

        lane.appendChild(node);
        nextOrder.push(messageId);
        scheduleMessageTimer(messageId);
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
          node.style.transform = "translateX(0) scale(1)";
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

      if (isOverflowFadeMode()) {
        clearExpiredQueue();
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

        scheduleMessageTimer(message.id);
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
      const useOverflowFade = isOverflowFadeMode(profile);
      while (state.messageOrder.length > profile.maxVisible) {
        const oldestId = state.messageOrder[0];
        if (!oldestId) {
          break;
        }
        removeMessageNode(oldestId, !useOverflowFade);
      }
    }

    function updateExistingRowStyles() {
      const renderer = getRendererApi();
      if (!renderer) {
        return;
      }
      renderer.updateRows(state.messageNodes.values());
      syncFadeOutModeForVisibleMessages();
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
      
      // 斜め移動を避け、上方向へわずかに抜ける自然なフェードアウト
      const fadeShiftY = -Math.max(8, Math.round(profile.fontSizePx * 0.35));

      node.style.transition = `opacity ${fadeMs}ms cubic-bezier(0.4, 0, 1, 1), transform ${fadeMs}ms cubic-bezier(0.4, 0, 1, 1)`;
      node.style.opacity = "0";
      node.style.transform = `translateY(${fadeShiftY}px) scale(0.98)`;

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
      clearExpiredQueue();
      resetFlowSurgeState();

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

    return {
      markSeenId,
      enqueueMessage,
      syncEditDummyRows,
      restoreVisibleMessagesFromHistory,
      revealHistoryDuringDrag,
      triggerSequentialFadeOutForVisibleMessages,
      updateExistingRowStyles,
      clearMessageTimer,
      removeMessageNode,
      clearAllMessages,
      enforceMaxVisible
    };
  }

  window.YTChatOverlayMessageFlow = {
    create
  };
})();
