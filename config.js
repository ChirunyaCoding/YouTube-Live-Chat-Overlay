(() => {
  if (window.top !== window) {
    return;
  }

  const STORAGE_KEY = "overlaySettings";
  const MODE_KEYS = ["fullscreen", "theater", "normal"];
  const PANEL_STATE_KEYS = ["open", "closed"];
  const EDIT_DUMMY_ID_PREFIX = "__yt_edit_dummy__";
  const OFFSET_MAX_X_BASE = 1920;
  const OFFSET_MAX_Y_BASE = 1080;
  const OVERLAY_ROOT_ID = "yt-chat-overlay-root";
  const OVERLAY_LANE_ID = "yt-chat-overlay-lane";

  const RENDERER_SELECTOR = [
    "yt-live-chat-text-message-renderer",
    "yt-live-chat-paid-message-renderer",
    "yt-live-chat-legacy-paid-message-renderer",
    "yt-live-chat-membership-item-renderer",
    "yt-live-chat-sponsorships-gift-purchase-announcement-renderer",
    "yt-live-chat-sponsorships-gift-redemption-announcement-renderer",
    "yt-live-chat-membership-gift-purchase-announcement-renderer",
    "yt-live-chat-membership-gift-redemption-announcement-renderer",
    "yt-live-chat-paid-sticker-renderer",
    "yt-live-chat-banner-renderer",
    "yt-live-chat-banner-chat-summary-renderer",
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

  const DEFAULT_MODE_PROFILE = {
    maxVisible: 8,
    fadeOutTrigger: "timer",
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
    identityAlign: "left",
    offsetsByAnchorX: {
      left: 12,
      right: 12
    },
    offsetsByAnchorY: {
      top: 24,
      bottom: 24
    },
    offsetXPx: 12,
    offsetYPx: 24,
    strokePx: 1.6,
    textOpacity: 1,
    messageBgOpacity: 0.28,
    showAvatar: true,
    showAuthorName: true
  };

  const DEFAULT_SHARED_PROFILE_FIELDS = {
    fontSizePx: false,
    anchorSettings: false
  };

  function cloneModeProfile(modeProfile) {
    return {
      ...modeProfile,
      offsetsByAnchorX: {
        ...(modeProfile.offsetsByAnchorX || DEFAULT_MODE_PROFILE.offsetsByAnchorX)
      },
      offsetsByAnchorY: {
        ...(modeProfile.offsetsByAnchorY || DEFAULT_MODE_PROFILE.offsetsByAnchorY)
      }
    };
  }

  function createModeProfiles(modeProfile) {
    return {
      fullscreen: cloneModeProfile(modeProfile),
      theater: cloneModeProfile(modeProfile),
      normal: cloneModeProfile(modeProfile)
    };
  }

  function createPanelModeProfiles(modeProfile) {
    return {
      open: createModeProfiles(modeProfile),
      closed: createModeProfiles(modeProfile)
    };
  }

  const DEFAULT_CONFIG = {
    enabledModes: {
      fullscreen: true,
      theater: true,
      normal: true
    },
    sharedProfileFields: { ...DEFAULT_SHARED_PROFILE_FIELDS },
    modeProfiles: createModeProfiles(DEFAULT_MODE_PROFILE),
    panelModeProfiles: createPanelModeProfiles(DEFAULT_MODE_PROFILE),
    maxVisible: DEFAULT_MODE_PROFILE.maxVisible,
    fadeOutTrigger: DEFAULT_MODE_PROFILE.fadeOutTrigger,
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
    identityAlign: DEFAULT_MODE_PROFILE.identityAlign,
    offsetsByAnchorX: { ...DEFAULT_MODE_PROFILE.offsetsByAnchorX },
    offsetsByAnchorY: { ...DEFAULT_MODE_PROFILE.offsetsByAnchorY },
    offsetXPx: DEFAULT_MODE_PROFILE.offsetXPx,
    offsetYPx: DEFAULT_MODE_PROFILE.offsetYPx,
    strokePx: DEFAULT_MODE_PROFILE.strokePx,
    textOpacity: DEFAULT_MODE_PROFILE.textOpacity,
    messageBgOpacity: DEFAULT_MODE_PROFILE.messageBgOpacity,
    showAvatar: DEFAULT_MODE_PROFILE.showAvatar,
    showAuthorName: DEFAULT_MODE_PROFILE.showAuthorName
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
    const fadeOutTrigger =
      input.fadeOutTrigger === "overflow"
        ? "overflow"
        : input.fadeOutTrigger === "timer"
          ? "timer"
          : fallback.fadeOutTrigger;
    const verticalAlign =
      input.verticalAlign === "top"
        ? "top"
        : input.verticalAlign === "bottom"
          ? "bottom"
          : fallback.verticalAlign;
    const identityAlign =
      input.identityAlign === "right"
        ? "right"
        : input.identityAlign === "left"
          ? "left"
          : fallback.identityAlign;
    const offsetXInput =
      typeof input.offsetXPx !== "undefined" ? input.offsetXPx : input.leftOffsetPx;
    const offsetYInput =
      typeof input.offsetYPx !== "undefined" ? input.offsetYPx : input.bottomOffsetPx;

    const fallbackOffsetX = Math.round(
      clampNumber(fallback.offsetXPx, 0, OFFSET_MAX_X_BASE, DEFAULT_MODE_PROFILE.offsetXPx)
    );
    const fallbackOffsetY = Math.round(
      clampNumber(fallback.offsetYPx, 0, OFFSET_MAX_Y_BASE, DEFAULT_MODE_PROFILE.offsetYPx)
    );
    const fallbackOffsetsByAnchorXInput =
      fallback.offsetsByAnchorX && typeof fallback.offsetsByAnchorX === "object"
        ? fallback.offsetsByAnchorX
        : {};
    const fallbackOffsetsByAnchorYInput =
      fallback.offsetsByAnchorY && typeof fallback.offsetsByAnchorY === "object"
        ? fallback.offsetsByAnchorY
        : {};
    const fallbackOffsetsByAnchorX = {
      left: Math.round(clampNumber(fallbackOffsetsByAnchorXInput.left, 0, OFFSET_MAX_X_BASE, fallbackOffsetX)),
      right: Math.round(
        clampNumber(fallbackOffsetsByAnchorXInput.right, 0, OFFSET_MAX_X_BASE, fallbackOffsetX)
      )
    };
    const fallbackOffsetsByAnchorY = {
      top: Math.round(clampNumber(fallbackOffsetsByAnchorYInput.top, 0, OFFSET_MAX_Y_BASE, fallbackOffsetY)),
      bottom: Math.round(
        clampNumber(fallbackOffsetsByAnchorYInput.bottom, 0, OFFSET_MAX_Y_BASE, fallbackOffsetY)
      )
    };

    const inputOffsetsByAnchorX =
      input.offsetsByAnchorX && typeof input.offsetsByAnchorX === "object"
        ? input.offsetsByAnchorX
        : {};
    const inputOffsetsByAnchorY =
      input.offsetsByAnchorY && typeof input.offsetsByAnchorY === "object"
        ? input.offsetsByAnchorY
        : {};
    const legacyOffsetXFallback =
      typeof offsetXInput !== "undefined" ? offsetXInput : fallbackOffsetsByAnchorX.left;
    const legacyOffsetYFallback =
      typeof offsetYInput !== "undefined" ? offsetYInput : fallbackOffsetsByAnchorY.bottom;
    const offsetsByAnchorX = {
      left: Math.round(clampNumber(inputOffsetsByAnchorX.left, 0, OFFSET_MAX_X_BASE, legacyOffsetXFallback)),
      right: Math.round(clampNumber(inputOffsetsByAnchorX.right, 0, OFFSET_MAX_X_BASE, legacyOffsetXFallback))
    };
    const offsetsByAnchorY = {
      top: Math.round(clampNumber(inputOffsetsByAnchorY.top, 0, OFFSET_MAX_Y_BASE, legacyOffsetYFallback)),
      bottom: Math.round(
        clampNumber(inputOffsetsByAnchorY.bottom, 0, OFFSET_MAX_Y_BASE, legacyOffsetYFallback)
      )
    };
    const activeOffsetXPx =
      horizontalAlign === "right" ? offsetsByAnchorX.right : offsetsByAnchorX.left;
    const activeOffsetYPx =
      verticalAlign === "top" ? offsetsByAnchorY.top : offsetsByAnchorY.bottom;

    return {
      maxVisible: Math.round(clampNumber(input.maxVisible, 1, 20, fallback.maxVisible)),
      fadeOutTrigger,
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
      fontSizePx: Math.round(clampNumber(input.fontSizePx, 12, 64, fallback.fontSizePx)),
      fontWeight: Math.round(clampNumber(input.fontWeight, 100, 900, fallback.fontWeight)),
      avatarSizePx: Math.round(clampNumber(input.avatarSizePx, 24, 96, fallback.avatarSizePx)),
      rowGapPx: Math.round(clampNumber(input.rowGapPx, 0, 24, fallback.rowGapPx)),
      horizontalAlign,
      verticalAlign,
      identityAlign,
      offsetsByAnchorX,
      offsetsByAnchorY,
      offsetXPx: activeOffsetXPx,
      offsetYPx: activeOffsetYPx,
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

  function normalizeSharedProfileFields(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    return {
      fontSizePx:
        typeof input.fontSizePx === "boolean"
          ? input.fontSizePx
          : DEFAULT_SHARED_PROFILE_FIELDS.fontSizePx,
      anchorSettings:
        typeof input.anchorSettings === "boolean"
          ? input.anchorSettings
          : DEFAULT_SHARED_PROFILE_FIELDS.anchorSettings
    };
  }

  function syncProfileActiveOffsets(profile) {
    if (!profile || typeof profile !== "object") {
      return;
    }
    profile.offsetXPx =
      profile.horizontalAlign === "right"
        ? profile.offsetsByAnchorX.right
        : profile.offsetsByAnchorX.left;
    profile.offsetYPx =
      profile.verticalAlign === "top"
        ? profile.offsetsByAnchorY.top
        : profile.offsetsByAnchorY.bottom;
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
    const sharedProfileFieldsInput =
      input.sharedProfileFields && typeof input.sharedProfileFields === "object"
        ? input.sharedProfileFields
        : {};
    const modeSizeScaleInput =
      input.modeSizeScale && typeof input.modeSizeScale === "object"
        ? input.modeSizeScale
        : {};
    const sharedProfileFields = normalizeSharedProfileFields(sharedProfileFieldsInput);

    const legacyBaseProfile = normalizeModeProfile(input, DEFAULT_MODE_PROFILE);
    const legacyScale = {
      fullscreen: clampNumber(modeSizeScaleInput.fullscreen, 0.4, 2.5, 1),
      theater: clampNumber(modeSizeScaleInput.theater, 0.4, 2.5, 1),
      normal: clampNumber(modeSizeScaleInput.normal, 0.4, 2.5, 1)
    };

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
    const sharedFadeOutTrigger =
      input.fadeOutTrigger === "overflow"
        ? "overflow"
        : input.fadeOutTrigger === "timer"
          ? "timer"
          : panelModeProfiles.closed.fullscreen.fadeOutTrigger;
    for (const panelState of PANEL_STATE_KEYS) {
      for (const mode of MODE_KEYS) {
        panelModeProfiles[panelState][mode].textOpacity = sharedTextOpacity;
        panelModeProfiles[panelState][mode].messageBgOpacity = sharedMessageBgOpacity;
        panelModeProfiles[panelState][mode].fadeOutTrigger = sharedFadeOutTrigger;
      }
    }

    if (sharedProfileFields.fontSizePx) {
      const sharedFontSize = panelModeProfiles.closed.fullscreen.fontSizePx;
      for (const panelState of PANEL_STATE_KEYS) {
        for (const mode of MODE_KEYS) {
          panelModeProfiles[panelState][mode].fontSizePx = sharedFontSize;
        }
      }
    }

    if (sharedProfileFields.anchorSettings) {
      const sharedHorizontalAlign = panelModeProfiles.closed.fullscreen.horizontalAlign;
      const sharedVerticalAlign = panelModeProfiles.closed.fullscreen.verticalAlign;
      const sharedIdentityAlign = panelModeProfiles.closed.fullscreen.identityAlign;
      for (const panelState of PANEL_STATE_KEYS) {
        for (const mode of MODE_KEYS) {
          panelModeProfiles[panelState][mode].horizontalAlign = sharedHorizontalAlign;
          panelModeProfiles[panelState][mode].verticalAlign = sharedVerticalAlign;
          panelModeProfiles[panelState][mode].identityAlign = sharedIdentityAlign;
          syncProfileActiveOffsets(panelModeProfiles[panelState][mode]);
        }
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
      sharedProfileFields,
      modeProfiles: panelModeProfiles.closed,
      panelModeProfiles,
      maxVisible: panelModeProfiles.closed.fullscreen.maxVisible,
      fadeOutTrigger: panelModeProfiles.closed.fullscreen.fadeOutTrigger,
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
      identityAlign: panelModeProfiles.closed.fullscreen.identityAlign,
      offsetsByAnchorX: panelModeProfiles.closed.fullscreen.offsetsByAnchorX,
      offsetsByAnchorY: panelModeProfiles.closed.fullscreen.offsetsByAnchorY,
      offsetXPx: panelModeProfiles.closed.fullscreen.offsetXPx,
      offsetYPx: panelModeProfiles.closed.fullscreen.offsetYPx,
      strokePx: panelModeProfiles.closed.fullscreen.strokePx,
      textOpacity: panelModeProfiles.closed.fullscreen.textOpacity,
      messageBgOpacity: panelModeProfiles.closed.fullscreen.messageBgOpacity,
      showAvatar: panelModeProfiles.closed.fullscreen.showAvatar,
      showAuthorName: panelModeProfiles.closed.fullscreen.showAuthorName
    };
  }

  window.YTChatOverlayConfig = {
    STORAGE_KEY,
    MODE_KEYS,
    PANEL_STATE_KEYS,
    EDIT_DUMMY_ID_PREFIX,
    OFFSET_MAX_X_BASE,
    OFFSET_MAX_Y_BASE,
    OVERLAY_ROOT_ID,
    OVERLAY_LANE_ID,
    RENDERER_SELECTOR,
    TYPE_INFO,
    DEFAULT_MODE_PROFILE,
    DEFAULT_CONFIG,
    createModeProfiles,
    createPanelModeProfiles,
    clampNumber,
    normalizeModeProfile,
    buildLegacyScaledProfile,
    normalizeConfig
  };
})();
