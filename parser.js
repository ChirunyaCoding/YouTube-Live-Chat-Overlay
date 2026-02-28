(() => {
  if (window.top !== window) {
    return;
  }

  function isElementNode(node) {
    return Boolean(node && node.nodeType === Node.ELEMENT_NODE);
  }

  function toElement(node) {
    return isElementNode(node) ? node : null;
  }

  function create(deps) {
    const rendererSelector = deps && deps.rendererSelector ? deps.rendererSelector : "";
    const typeInfo = deps && deps.typeInfo ? deps.typeInfo : {};
    const getCurrentModeProfile =
      deps && typeof deps.getCurrentModeProfile === "function"
        ? deps.getCurrentModeProfile
        : () => ({ maxVisible: 8 });
    const hasSeenId =
      deps && typeof deps.hasSeenId === "function" ? deps.hasSeenId : () => false;
    const markSeenId =
      deps && typeof deps.markSeenId === "function" ? deps.markSeenId : () => {};

    function collectRendererElements(node, output) {
      const element = toElement(node);
      if (!element) {
        return;
      }

      const added = [];
      if (element.matches(rendererSelector)) {
        added.push(element);
      }

      for (const child of element.querySelectorAll(rendererSelector)) {
        added.push(child);
      }

      for (const candidate of added) {
        if (!output.includes(candidate)) {
          output.push(candidate);
        }
      }
    }

    function mapRendererType(renderer) {
      const tag = renderer.tagName.toLowerCase();
      switch (tag) {
        case "yt-live-chat-text-message-renderer":
          return "text";
        case "yt-live-chat-paid-message-renderer":
        case "yt-live-chat-legacy-paid-message-renderer":
          return "paid";
        case "yt-live-chat-membership-item-renderer":
        case "yt-live-chat-sponsorships-gift-purchase-announcement-renderer":
        case "yt-live-chat-sponsorships-gift-redemption-announcement-renderer":
        case "yt-live-chat-membership-gift-purchase-announcement-renderer":
        case "yt-live-chat-membership-gift-redemption-announcement-renderer":
          return "membership";
        case "yt-live-chat-paid-sticker-renderer":
          return "sticker";
        case "yt-live-chat-banner-chat-summary-renderer": {
          if (
            renderer.querySelector("#purchase-amount, #purchase-amount-chip, .purchase-amount-chip")
          ) {
            return "paid";
          }
          if (
            renderer.querySelector(
              "#header-subtext, #header-primary-text, #primary-text, .primary-text, #author-name"
            )
          ) {
            return "membership";
          }
          return "engagement";
        }
        case "yt-live-chat-viewer-engagement-message-renderer":
          return "engagement";
        case "yt-live-chat-mode-change-message-renderer":
          return "mode_change";
        default:
          return "";
      }
    }

    function unwrapRendererForParsing(renderer) {
      const element = toElement(renderer);
      if (!element) {
        return null;
      }

      const tag = element.tagName.toLowerCase();
      if (tag !== "yt-live-chat-banner-renderer") {
        return element;
      }

      const nested = element.querySelector(
        [
          "yt-live-chat-paid-message-renderer",
          "yt-live-chat-legacy-paid-message-renderer",
          "yt-live-chat-paid-sticker-renderer",
          "yt-live-chat-membership-item-renderer",
          "yt-live-chat-sponsorships-gift-purchase-announcement-renderer",
          "yt-live-chat-sponsorships-gift-redemption-announcement-renderer",
          "yt-live-chat-membership-gift-purchase-announcement-renderer",
          "yt-live-chat-membership-gift-redemption-announcement-renderer",
          "yt-live-chat-banner-chat-summary-renderer"
        ].join(",")
      );

      return nested || element;
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

    function getEmojiElementBackgroundSource(node) {
      const element = toElement(node);
      if (!element) {
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

    function isSystemAuthorName(name) {
      return /^system$/i.test(String(name || "").trim());
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

    function parseRunsFromElement(element) {
      if (!element) {
        return [];
      }

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

        const childElement = toElement(node);
        if (!childElement) {
          return;
        }

        const tag = childElement.tagName.toLowerCase();
        if (tag === "img") {
          const emojiRun = makeEmojiRun(
            getImageSource(childElement),
            childElement.getAttribute("alt") || ""
          );
          if (emojiRun) {
            runs.push(emojiRun);
            return;
          }

          const altText = makeTextRun(childElement.getAttribute("alt") || "");
          if (altText) {
            runs.push(altText);
          }
          return;
        }

        const backgroundEmojiSrc = getEmojiElementBackgroundSource(childElement);
        if (backgroundEmojiSrc) {
          const emojiRun = makeEmojiRun(
            backgroundEmojiSrc,
            childElement.getAttribute("alt") ||
              childElement.getAttribute("aria-label") ||
              childElement.getAttribute("title") ||
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

        for (const child of childElement.childNodes) {
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

    function resolveIsMemberAuthor(renderer, type, authorBadges) {
      if (type === "membership") {
        return true;
      }

      const authorNode = renderer.querySelector("#author-name");
      if (authorNode) {
        const typeAttr = (authorNode.getAttribute("type") || "").toLowerCase();
        const className =
          typeof authorNode.className === "string" ? authorNode.className.toLowerCase() : "";
        if (
          typeAttr.includes("member") ||
          typeAttr.includes("sponsor") ||
          className.includes("member") ||
          className.includes("sponsor")
        ) {
          return true;
        }
      }

      for (const badge of Array.isArray(authorBadges) ? authorBadges : []) {
        const label = String((badge && badge.label) || "");
        if (/member|sponsor|メンバー|メンバ/i.test(label)) {
          return true;
        }
      }
      return false;
    }

    function resolveMessageRuns(renderer, type) {
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

        runs.push(
          ...buildRunsFromSelectors(renderer, [
            "#message",
            ".message",
            "#text",
            ".text",
            "#primary-text",
            ".primary-text",
            "#header-primary-text",
            "#snippet-text"
          ])
        );
        return compactRuns(runs);
      }

      if (type === "membership") {
        const header = pickFirstText(renderer, [
          "#header-subtext",
          "#header-primary-text",
          "#primary-text",
          ".primary-text"
        ]);
        const headerRun = makeTextRun(header ? `${header} ` : "");
        if (headerRun) {
          runs.push(headerRun);
        }

        runs.push(
          ...buildRunsFromSelectors(renderer, [
            "#message",
            ".message",
            "#primary-text",
            ".primary-text",
            "#text",
            ".text",
            "#header-subtext",
            ".header-subtext",
            "#snippet-text"
          ])
        );
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
        runs.push(
          ...buildRunsFromSelectors(renderer, [
            "#message",
            "#sticker",
            ".message",
            "#sticker-display-text",
            "#text",
            ".text"
          ])
        );
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
      const currentTypeInfo = typeInfo[type] || typeInfo.text || {};
      const fallbackColor = currentTypeInfo.fallbackColor || "rgb(255, 255, 255)";

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
        return fallbackColor;
      }

      return fallbackColor;
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
          const body = pickFirstText(renderer, [
            "#message",
            ".message",
            "#text",
            ".text",
            "#primary-text",
            ".primary-text",
            "#header-primary-text",
            "#snippet-text"
          ]);
          return [amount, body].filter(Boolean).join(" ");
        }
        case "membership": {
          const header = pickFirstText(renderer, [
            "#header-subtext",
            "#header-primary-text",
            "#primary-text",
            ".primary-text"
          ]);
          const body = pickFirstText(renderer, [
            "#message",
            ".message",
            "#primary-text",
            ".primary-text",
            "#text",
            ".text",
            "#header-subtext",
            ".header-subtext",
            "#snippet-text"
          ]);
          return [header, body].filter(Boolean).join(" ");
        }
        case "sticker": {
          const amount = pickFirstText(renderer, [
            "#purchase-amount-chip",
            "#purchase-amount",
            ".purchase-amount-chip"
          ]);
          const sticker = pickFirstText(renderer, [
            "#sticker",
            "#message",
            "#sticker-display-text",
            "#text",
            ".text"
          ]);
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

    function parseRendererMessage(renderer) {
      const parseTarget = unwrapRendererForParsing(renderer);
      if (!parseTarget) {
        return null;
      }

      const type = mapRendererType(parseTarget);
      if (!type) {
        return null;
      }

      const authorName = resolveAuthorName(parseTarget);
      if (type === "text" && isSystemAuthorName(authorName)) {
        return null;
      }
      const timestampMs = Date.now();
      const messageRuns = resolveMessageRuns(parseTarget, type);
      const runsText = runsToPlainText(messageRuns);
      const rawText = runsText || resolveMessageText(parseTarget, type);
      const label = typeInfo[type] ? typeInfo[type].label : "";
      const text = rawText || label || "";
      const timestampToken = resolveTimestampToken(parseTarget, timestampMs);
      const id = buildMessageId(parseTarget, type, authorName, text, timestampToken);
      const authorBadges = resolveAuthorBadges(parseTarget);
      const isMember = resolveIsMemberAuthor(parseTarget, type, authorBadges);

      if (hasSeenId(id)) {
        return null;
      }

      markSeenId(id);

      return {
        id,
        type,
        authorName,
        authorAvatarUrl: resolveAvatarUrl(parseTarget),
        text,
        messageRuns,
        authorBadges,
        isMember,
        timestampMs,
        accentColor: resolveAccentColor(parseTarget, type),
        priority: typeInfo[type] ? typeInfo[type].priority : 1
      };
    }

    function getReplayStartIndex(existingRenderers) {
      const profile = getCurrentModeProfile();
      return Math.max(0, existingRenderers.length - profile.maxVisible);
    }

    return {
      collectRendererElements,
      parseRendererMessage,
      getReplayStartIndex
    };
  }

  window.YTChatOverlayParser = {
    create
  };
})();
