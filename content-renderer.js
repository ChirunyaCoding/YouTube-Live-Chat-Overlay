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
            messageBgOpacity: 0.28,
            showAvatar: true,
            showAuthorName: true,
            textOpacity: 1,
            fontWeight: 900
          });

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
      const backgroundOpacity = Math.max(0, Number(profile.messageBgOpacity) || 0);
      row.style.background = `rgba(0, 0, 0, ${backgroundOpacity})`;
      row.style.borderRadius = `${Math.max(8, Math.round(fontSizePx * 0.55))}px`;
      const backdropValue = backgroundOpacity > 0 ? "blur(1px)" : "none";
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
        author.style.color =
          row.dataset.accentColor || (typeInfo.text && typeInfo.text.fallbackColor) || "#ffffff";
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
