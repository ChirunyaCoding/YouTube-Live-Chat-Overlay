(() => {
  if (window.top !== window) {
    return;
  }

  function create(deps) {
    const state = deps && deps.state ? deps.state : {};
    const rendererSelector = deps && deps.rendererSelector ? deps.rendererSelector : "";
    const getParserApi =
      deps && typeof deps.getParserApi === "function" ? deps.getParserApi : () => null;
    const getCurrentModeProfile =
      deps && typeof deps.getCurrentModeProfile === "function"
        ? deps.getCurrentModeProfile
        : () => ({ maxVisible: 8 });
    const enqueueMessage =
      deps && typeof deps.enqueueMessage === "function" ? deps.enqueueMessage : () => {};
    const scheduleSync =
      deps && typeof deps.scheduleSync === "function" ? deps.scheduleSync : () => {};

    const findChatContainer =
      deps && typeof deps.findChatContainer === "function"
        ? deps.findChatContainer
        : () => null;
    const findChatIframe =
      deps && typeof deps.findChatIframe === "function" ? deps.findChatIframe : () => null;
    const isChatContainerCollapsed =
      deps && typeof deps.isChatContainerCollapsed === "function"
        ? deps.isChatContainerCollapsed
        : () => false;
    const isElementVisiblyDisplayed =
      deps && typeof deps.isElementVisiblyDisplayed === "function"
        ? deps.isElementVisiblyDisplayed
        : () => false;
    const getCurrentVideoId =
      deps && typeof deps.getCurrentVideoId === "function" ? deps.getCurrentVideoId : () => "";
    const getHiddenChatUrls =
      deps && typeof deps.getHiddenChatUrls === "function" ? deps.getHiddenChatUrls : () => [];

    function shouldHideNativeChat() {
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

      const existing = Array.from(itemsNode.querySelectorAll(rendererSelector));
      const profile = getCurrentModeProfile();
      const startIndex = Math.max(0, existing.length - profile.maxVisible);
      for (let i = startIndex; i < existing.length; i += 1) {
        const message = parser.parseRendererMessage(existing[i]);
        if (message) {
          enqueueMessage(message);
        }
      }
    }

    function connectChatSource() {
      const nativeIframe = findChatIframe();
      const nativeItemsNode = getChatItemsNode(nativeIframe);

      let iframe = nativeIframe;
      let itemsNode = nativeItemsNode;
      let usesHiddenSource = false;

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

    return {
      shouldHideNativeChat,
      getCurrentChatPanelState,
      hideNativeChat,
      restoreNativeChat,
      removeHiddenChatIframe,
      disconnectChatSource,
      connectChatSource
    };
  }

  window.YTChatOverlayChatSource = {
    create
  };
})();
