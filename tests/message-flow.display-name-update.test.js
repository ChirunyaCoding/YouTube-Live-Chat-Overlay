const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadMessageFlowFactory() {
  const source = fs.readFileSync(path.join(process.cwd(), "message-flow.js"), "utf8");

  const sandbox = {
    console,
    Map,
    Set,
    Date
  };

  const windowObject = {
    top: null,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {}
  };
  windowObject.top = windowObject;
  windowObject.window = windowObject;
  sandbox.window = windowObject;

  vm.runInNewContext(source, sandbox, { filename: "message-flow.js" });
  return sandbox.window.YTChatOverlayMessageFlow.create;
}

test("updateMessageAuthorDisplayName は履歴・キュー・表示行を同時更新する", () => {
  const createMessageFlow = loadMessageFlowFactory();
  const state = {
    messageHistoryMap: new Map(),
    renderQueue: [],
    messageNodes: new Map()
  };

  const historyMessage = { id: "m-1", authorDisplayName: "old-name" };
  const queuedMessage = { id: "m-1", authorDisplayName: "old-name" };
  const row = { dataset: { authorDisplayName: "old-name" } };

  state.messageHistoryMap.set(historyMessage.id, historyMessage);
  state.renderQueue.push(queuedMessage);
  state.messageNodes.set(historyMessage.id, row);

  const updatedRows = [];
  let syncLayoutCallCount = 0;

  const api = createMessageFlow({
    state,
    getRendererApi: () => ({
      updateRows: (rows) => {
        updatedRows.push(...rows);
      }
    }),
    syncDragOverlayLayout: () => {
      syncLayoutCallCount += 1;
    }
  });

  const changed = api.updateMessageAuthorDisplayName("m-1", "  New Channel Name  ");

  assert.equal(changed, true);
  assert.equal(historyMessage.authorDisplayName, "New Channel Name");
  assert.equal(queuedMessage.authorDisplayName, "New Channel Name");
  assert.equal(row.dataset.authorDisplayName, "New Channel Name");
  assert.equal(updatedRows.length, 1);
  assert.equal(updatedRows[0], row);
  assert.equal(syncLayoutCallCount, 1);
});

test("updateMessageAuthorDisplayName は空表示名を無視する", () => {
  const createMessageFlow = loadMessageFlowFactory();
  const state = {
    messageHistoryMap: new Map(),
    renderQueue: [],
    messageNodes: new Map()
  };

  const api = createMessageFlow({ state });
  const changed = api.updateMessageAuthorDisplayName("m-2", "   ");

  assert.equal(changed, false);
});
