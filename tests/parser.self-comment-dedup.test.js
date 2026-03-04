const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadParserFactory() {
  const source = fs.readFileSync(path.join(process.cwd(), "parser.js"), "utf8");

  const windowObject = {
    top: null,
    getComputedStyle: () => ({
      color: "rgb(255, 255, 255)",
      backgroundImage: "",
      getPropertyValue: () => ""
    })
  };
  windowObject.top = windowObject;
  windowObject.window = windowObject;

  const sandbox = {
    console,
    window: windowObject,
    Node: {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3
    },
    Date,
    Set,
    Map,
    URL,
    location: {
      protocol: "https:",
      origin: "https://www.youtube.com"
    }
  };

  vm.runInNewContext(source, sandbox, { filename: "parser.js" });
  return sandbox.window.YTChatOverlayParser.create;
}

function createTextElement(text) {
  return {
    nodeType: 1,
    tagName: "SPAN",
    innerText: text,
    textContent: text,
    childNodes: [],
    getAttribute: () => null,
    querySelectorAll: () => []
  };
}

function createTextMessageRenderer(params) {
  const attributes = params && params.attributes ? params.attributes : {};
  const authorNode = createTextElement((params && params.authorText) || "");
  const messageNode = createTextElement((params && params.messageText) || "");
  const timestampNode = createTextElement((params && params.timestampText) || "");

  return {
    nodeType: 1,
    tagName: "YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER",
    data: params && params.data ? params.data : null,
    getAttribute: (name) =>
      Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null,
    querySelector: (selector) => {
      if (selector.includes("#author-name") || selector.includes(".author-name")) {
        return authorNode;
      }
      if (selector.includes("#message") || selector.includes(".message")) {
        return messageNode;
      }
      if (selector.includes("#timestamp") || selector.includes(".timestamp")) {
        return timestampNode;
      }
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector === "yt-live-chat-author-badge-renderer") {
        return [];
      }
      return [];
    }
  };
}

test("parseRendererMessage は仮レンダラーの data.id を使って自己コメントの重複を防ぐ", () => {
  const createParser = loadParserFactory();
  const seenIds = new Set();

  const parser = createParser({
    rendererSelector: "yt-live-chat-text-message-renderer",
    typeInfo: {
      text: { label: "", priority: 1, fallbackColor: "rgb(255, 255, 255)" }
    },
    hasSeenId: (id) => seenIds.has(id),
    markSeenId: (id) => seenIds.add(id)
  });

  const stableId = "ChwKGkNQb1FzN3d6Q0FZc0F3";
  const provisionalRenderer = createTextMessageRenderer({
    attributes: { id: "message" },
    data: { id: stableId },
    authorText: "ちはる。",
    messageText: "キレすぎw",
    timestampText: "12:34"
  });
  const finalRenderer = createTextMessageRenderer({
    attributes: { "data-id": stableId },
    data: { id: stableId },
    authorText: "ちはる。",
    messageText: "キレすぎw",
    timestampText: "12:34"
  });

  const first = parser.parseRendererMessage(provisionalRenderer);
  assert.ok(first);
  assert.equal(first.id, `text|${stableId}`);

  const second = parser.parseRendererMessage(finalRenderer);
  assert.equal(second, null);
});
