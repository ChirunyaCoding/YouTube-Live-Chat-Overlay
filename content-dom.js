(() => {
  if (window.top !== window) {
    return;
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

  function isWatchPageActive() {
    if (document.querySelector("ytd-watch-flexy")) {
      return true;
    }
    return location.pathname === "/watch" || location.pathname.startsWith("/live/");
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

    const candidates = ["#movie_player", ".html5-video-player", "ytd-player", "#player"];
    for (const selector of candidates) {
      const node = document.querySelector(selector);
      if (node) {
        return node;
      }
    }

    return null;
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

  window.YTChatOverlayDom = {
    getFullscreenApiElement,
    getFullscreenPlayerElement,
    isFullscreenActive,
    isTheaterActive,
    isWatchPageActive,
    isElementVisiblyDisplayed,
    isChatContainerCollapsed,
    resolveFullscreenHost,
    getPlayerHost,
    findChatContainer,
    findChatIframe,
    getCurrentVideoId,
    getHiddenChatUrls
  };
})();
