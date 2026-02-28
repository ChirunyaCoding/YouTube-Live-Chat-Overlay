(() => {
  if (window.top !== window) {
    return;
  }

  function create(deps) {
    const typeInfo = deps && deps.typeInfo ? deps.typeInfo : {};
    const getCurrentModeProfile =
      deps && typeof deps.getCurrentModeProfile === "function"
        ? deps.getCurrentModeProfile
        : () => ({
            fontSizePx: 22,
            avatarSizePx: 44,
            strokePx: 1.6,
            fadeMs: 300,
            animationPreset: "soft-rise",
            messageBgOpacity: 0.28,
            showAvatar: true,
            showAuthorName: true,
            authorNameMode: "handle",
            textOpacity: 1,
            fontWeight: 900
          });
    const hasYoutubeApiKey =
      deps && typeof deps.hasYoutubeApiKey === "function"
        ? deps.hasYoutubeApiKey
        : () => false;
    const ANIMATION_PRESET_SET = new Set([
      "soft-rise",
      "slide",
      "slide-reverse",
      "pop",
      "zoom",
      "flip",
      "float",
      "stretch"
    ]);

    // より自然で高品質なテキストシャドウを生成
    function createOutlineShadow(strokePx) {
      const distance = Math.max(0, Number(strokePx) || 0);
      if (distance === 0) return "0 2px 8px rgba(0,0,0,0.6)";
      
      // テキストの可読性を高めるための多重シャドウ（プロ仕様の縁取り）
      return `
        0 0 ${distance}px rgba(0,0,0,0.8),
        0 0 ${distance * 2}px rgba(0,0,0,0.8),
        ${distance}px ${distance}px ${distance}px rgba(0,0,0,0.9),
        -${distance}px -${distance}px ${distance}px rgba(0,0,0,0.9),
        ${distance}px -${distance}px ${distance}px rgba(0,0,0,0.9),
        -${distance}px ${distance}px ${distance}px rgba(0,0,0,0.9),
        0 4px 12px rgba(0,0,0,0.5)
      `.trim();
    }

    function createAvatarNode(message) {
      const avatar = document.createElement("div");
      avatar.className = "yt-chat-overlay-avatar";
      avatar.style.borderRadius = "999px";
      avatar.style.overflow = "hidden";
      avatar.style.border = "2px solid rgba(255, 255, 255, 0.8)";
      avatar.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      avatar.style.background = "rgba(255, 255, 255, 0.18)";
      avatar.style.display = "flex";
      avatar.style.alignItems = "center";
      avatar.style.justifyContent = "center";

      if (message.authorAvatarUrl) {
        const image = document.createElement("img");
        image.src = message.authorAvatarUrl;
        image.alt = message.authorDisplayName || message.authorHandle || message.authorName || "avatar";
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.objectFit = "cover";
        avatar.appendChild(image);
        return avatar;
      }

      const fallback = document.createElement("span");
      fallback.textContent = (
        message.authorDisplayName ||
        message.authorHandle ||
        message.authorName ||
        "?"
      )
        .slice(0, 1)
        .toUpperCase();
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

    function resolveLineHeightPx(node, fallbackPx) {
      if (!node) {
        return fallbackPx;
      }
      try {
        const computed = window.getComputedStyle(node);
        const value = parseFloat(computed.lineHeight);
        if (Number.isFinite(value) && value > 0) {
          return value;
        }
      } catch (_error) {
        // noop
      }
      return fallbackPx;
    }

    function shouldCenterTextAgainstAvatar(row, textWrap, body, fontSizePx) {
      if (!row || !textWrap) {
        return false;
      }

      const fallbackLineHeight = Math.max(14, Math.round((Number(fontSizePx) || 22) * 1.1));
      const targetNode = body || textWrap;
      if (!row.isConnected) {
        const plain = String((targetNode && targetNode.textContent) || "");
        return !plain.includes("\n");
      }

      const lineHeightPx = resolveLineHeightPx(targetNode, fallbackLineHeight);
      const textHeightPx =
        targetNode.getBoundingClientRect().height || targetNode.scrollHeight || 0;
      if (textHeightPx <= 0) {
        return false;
      }
      return textHeightPx <= lineHeightPx * 1.6;
    }

    function normalizeAnimationPreset(value) {
      return ANIMATION_PRESET_SET.has(value) ? value : "soft-rise";
    }

    function normalizeAuthorNameMode(value) {
      return value === "display-name" ? "display-name" : "handle";
    }

    function getEffectiveAuthorNameMode(requestedMode) {
      // APIキーがない場合は display-name モードを無効化
      if (requestedMode === "display-name" && !hasYoutubeApiKey()) {
        return "handle";
      }
      return requestedMode === "display-name" ? "display-name" : "handle";
    }

    function resolveAuthorTextForRow(row, profile) {
      const requestedMode = normalizeAuthorNameMode(profile && profile.authorNameMode);
      const mode = getEffectiveAuthorNameMode(requestedMode);
      const handle = String(row && row.dataset ? row.dataset.authorHandle || "" : "").trim();
      const displayName = String(
        row && row.dataset ? row.dataset.authorDisplayName || "" : ""
      ).trim();

      if (mode === "display-name") {
        return displayName || handle || "system";
      }

      const base = handle || displayName || "system";
      return base.startsWith("@") ? base : `@${base}`;
    }

    function getFadeInAnimationSpec(profile) {
      const preset = normalizeAnimationPreset(profile && profile.animationPreset);
      const baseFadeMs = Number(profile && profile.fadeMs);
      const durationMs = Math.max(
        220,
        Math.min(700, Math.round(Number.isFinite(baseFadeMs) ? baseFadeMs * 1.2 : 360))
      );
      if (preset === "slide") {
        return {
          durationMs,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fromTransform: "translateX(24px) scale(1)",
          toTransform: "translateX(0) scale(1)"
        };
      }
      if (preset === "slide-reverse") {
        return {
          durationMs,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fromTransform: "translateX(-24px) scale(1)",
          toTransform: "translateX(0) scale(1)"
        };
      }
      if (preset === "pop") {
        return {
          durationMs,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fromTransform: "translateY(8px) scale(0.88)",
          toTransform: "translateY(0) scale(1)"
        };
      }
      if (preset === "zoom") {
        return {
          durationMs,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          fromTransform: "translateY(4px) scale(1.08)",
          toTransform: "translateY(0) scale(1)"
        };
      }
      if (preset === "flip") {
        return {
          durationMs,
          easing: "cubic-bezier(0.18, 0.9, 0.22, 1.2)",
          fromTransform: "translateY(8px) rotate(-7deg) scale(0.9)",
          toTransform: "translateY(0) rotate(0deg) scale(1)"
        };
      }
      if (preset === "float") {
        return {
          durationMs,
          easing: "cubic-bezier(0.2, 1, 0.34, 1)",
          fromTransform: "translate(14px, 12px) scale(0.97)",
          toTransform: "translate(0, 0) scale(1)"
        };
      }
      if (preset === "stretch") {
        return {
          durationMs,
          easing: "cubic-bezier(0.2, 1.08, 0.3, 1)",
          fromTransform: "translateY(6px) scale(1.08, 0.82)",
          toTransform: "translateY(0) scale(1, 1)"
        };
      }
      return {
        durationMs,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fromTransform: "translateY(10px) scale(0.985)",
        toTransform: "translateY(0) scale(1)"
      };
    }

    function applyRowStyles(row) {
      const profile = getCurrentModeProfile();
      const isIdentityRightAligned = profile.identityAlign === "right";
      const fontSizePx = profile.fontSizePx;
      const inlineAssetSizePx = Math.max(1, Math.round(Number(fontSizePx) || 22));
      const avatarSizePx = profile.avatarSizePx;
      const strokePx = profile.strokePx;
      const avatar = row.querySelector(".yt-chat-overlay-avatar");
      const textWrap = row.querySelector(".yt-chat-overlay-text-wrap");
      const authorMeta = row.querySelector(".yt-chat-overlay-author-meta");
      const author = row.querySelector(".yt-chat-overlay-author");
      const badges = row.querySelector(".yt-chat-overlay-badges");
      const body = row.querySelector(".yt-chat-overlay-body");

      row.style.display = "flex";
      row.style.alignItems = "flex-start";
      row.style.flexDirection = isIdentityRightAligned ? "row-reverse" : "row";
      row.style.maxWidth = "100%";
      row.style.gap = profile.showAvatar
        ? `${Math.max(6, Math.round(avatarSizePx * 0.2))}px`
        : "0px";
      row.style.padding = `${Math.max(4, Math.round(fontSizePx * 0.2))}px ${Math.max(
        12,
        Math.round(fontSizePx * 0.6)
      )}px`;
      
      const backgroundOpacity = Math.max(0, Number(profile.messageBgOpacity) || 0);
      
      // 背景をグラスモーフィズム（すりガラス）風に、スーパーチャット等の色を反映
      const accentColor = row.dataset.accentColor;
      if (accentColor && row.dataset.messageType === "paid") {
        row.style.background = `linear-gradient(135deg, ${accentColor.replace('rgb', 'rgba').replace(')', `, ${backgroundOpacity * 0.5})`)} 0%, rgba(0, 0, 0, ${backgroundOpacity}) 100%)`;
      } else if (accentColor && row.dataset.messageType === "membership") {
        row.style.background = `linear-gradient(135deg, ${accentColor.replace('rgb', 'rgba').replace(')', `, ${backgroundOpacity * 0.4})`)} 0%, rgba(0, 0, 0, ${backgroundOpacity}) 100%)`;
      } else {
        row.style.background = `linear-gradient(135deg, rgba(255, 255, 255, ${backgroundOpacity * 0.2}) 0%, rgba(0, 0, 0, ${backgroundOpacity}) 100%)`;
      }
      
      row.style.boxShadow = `0 4px 16px rgba(0, 0, 0, ${backgroundOpacity * 0.5}), inset 0 1px 1px rgba(255, 255, 255, ${backgroundOpacity * 0.3})`;
      row.style.borderRadius = `${Math.max(12, Math.round(fontSizePx * 0.6))}px`;
      const backdropValue = backgroundOpacity > 0 ? "blur(8px) saturate(120%)" : "none";
      row.style.backdropFilter = backdropValue;
      row.style.webkitBackdropFilter = backdropValue;

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
        textWrap.style.display = "block";
        textWrap.style.minWidth = "0";
        textWrap.style.maxWidth = "100%";
        textWrap.style.flex = "1 1 auto";
        textWrap.style.overflow = "visible";
        textWrap.style.textAlign = isIdentityRightAligned ? "right" : "left";
      }

      if (textWrap && authorMeta && body) {
        if (isIdentityRightAligned) {
          if (textWrap.firstChild !== body) {
            textWrap.insertBefore(body, authorMeta);
          }
        } else if (textWrap.firstChild !== authorMeta) {
          textWrap.insertBefore(authorMeta, body);
        }
      }

      const outlineShadow = createOutlineShadow(strokePx);
      if (authorMeta) {
        authorMeta.style.display = profile.showAuthorName ? "inline-flex" : "none";
        authorMeta.style.alignItems = "center";
        authorMeta.style.gap = `${Math.max(4, Math.round(fontSizePx * 0.16))}px`;
        const authorGapPx = Math.max(6, Math.round(fontSizePx * 0.3));
        authorMeta.style.marginRight = isIdentityRightAligned ? "0" : `${authorGapPx}px`;
        authorMeta.style.marginLeft = isIdentityRightAligned ? `${authorGapPx}px` : "0";
        authorMeta.style.verticalAlign = "middle";
      }

      if (author) {
        const fallbackAuthorColor =
          row.dataset.accentColor || (typeInfo.text && typeInfo.text.fallbackColor) || "#ffffff";
        const isMemberAuthor = row.dataset.authorMembership === "member";
        author.textContent = resolveAuthorTextForRow(row, profile);
        author.style.color = isMemberAuthor
          ? profile.authorNameColorMember || fallbackAuthorColor
          : profile.authorNameColorNonMember || fallbackAuthorColor;
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
        badgeIcon.style.width = `${inlineAssetSizePx}px`;
        badgeIcon.style.height = `${inlineAssetSizePx}px`;
        badgeIcon.style.objectFit = "contain";
        badgeIcon.style.verticalAlign = "middle";
      }

      for (const badgeLabel of row.querySelectorAll(".yt-chat-overlay-badge-label")) {
        badgeLabel.style.display = "inline-flex";
        badgeLabel.style.alignItems = "center";
        badgeLabel.style.justifyContent = "center";
        badgeLabel.style.minWidth = `${inlineAssetSizePx}px`;
        badgeLabel.style.height = `${inlineAssetSizePx}px`;
        badgeLabel.style.padding = "0 4px";
        badgeLabel.style.borderRadius = "999px";
        badgeLabel.style.background = "rgba(255, 255, 255, 0.22)";
        badgeLabel.style.color = "#ffffff";
        badgeLabel.style.fontSize = `${Math.max(10, Math.round(fontSizePx * 0.45))}px`;
        badgeLabel.style.fontWeight = "700";
        badgeLabel.style.lineHeight = "1";
      }

      if (body) {
        body.style.color = profile.commentTextColor || "#ffffff";
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
        body.style.textAlign = isIdentityRightAligned ? "right" : "left";
        body.style.display = "inline";
        body.style.verticalAlign = "middle";
        body.style.writingMode = "horizontal-tb";
        body.style.textOrientation = "mixed";
      }

      for (const emoji of row.querySelectorAll(".yt-chat-overlay-inline-emoji")) {
        emoji.style.width = `${inlineAssetSizePx}px`;
        emoji.style.height = `${inlineAssetSizePx}px`;
        emoji.style.minWidth = `${inlineAssetSizePx}px`;
        emoji.style.objectFit = "contain";
        emoji.style.verticalAlign = "text-bottom";
        emoji.style.margin = "0 0.08em";
        emoji.style.display = "inline-block";
      }

      row.style.alignItems = shouldCenterTextAgainstAvatar(row, textWrap, body, fontSizePx)
        ? "center"
        : "flex-start";
    }

    function createMessageRow(message) {
      const row = document.createElement("div");
      row.dataset.messageId = message.id;
      row.dataset.messageType = message.type || "text";
      row.dataset.accentColor = message.accentColor || "";
      row.dataset.authorMembership =
        message.isMember === true || message.type === "membership" ? "member" : "non-member";
      row.dataset.authorHandle = String(message.authorHandle || message.authorName || "system");
      row.dataset.authorDisplayName = String(
        message.authorDisplayName || message.authorName || row.dataset.authorHandle || "system"
      );
      const animationSpec = getFadeInAnimationSpec(getCurrentModeProfile());

      row.style.opacity = "0";
      row.style.transform = animationSpec.fromTransform;
      row.style.transition =
        `opacity ${animationSpec.durationMs}ms ${animationSpec.easing}, transform ${animationSpec.durationMs}ms ${animationSpec.easing}`;

      const avatar = createAvatarNode(message);
      row.appendChild(avatar);

      const textWrap = document.createElement("div");
      textWrap.className = "yt-chat-overlay-text-wrap";

      const authorMeta = document.createElement("span");
      authorMeta.className = "yt-chat-overlay-author-meta";

      const author = document.createElement("span");
      author.className = "yt-chat-overlay-author";
      author.textContent = resolveAuthorTextForRow(row, getCurrentModeProfile());
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
        applyRowStyles(row);
        row.style.opacity = "1";
        row.style.transform = animationSpec.toTransform;
      });

      return row;
    }

    function updateRows(rows) {
      for (const row of rows) {
        applyRowStyles(row);
      }
    }

    return {
      createMessageRow,
      updateRows
    };
  }

  window.YTChatOverlayRenderer = {
    create
  };
})();
