const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadRendererSource() {
  return fs.readFileSync(path.join(process.cwd(), "renderer.js"), "utf8");
}

test("絵文字・バッジサイズは共通サイズ変数 inlineAssetSizePx を使用する", () => {
  const source = loadRendererSource();
  assert.match(
    source,
    /const inlineAssetSizePx = Math\.max\(1, Math\.round\(Number\(fontSizePx\) \|\| 22\)\);/
  );
  assert.match(source, /badgeIcon\.style\.width = `\$\{inlineAssetSizePx\}px`;/);
  assert.match(source, /badgeIcon\.style\.height = `\$\{inlineAssetSizePx\}px`;/);
  assert.match(source, /badgeLabel\.style\.minWidth = `\$\{inlineAssetSizePx\}px`;/);
  assert.match(source, /badgeLabel\.style\.height = `\$\{inlineAssetSizePx\}px`;/);
  assert.match(source, /emoji\.style\.width = `\$\{inlineAssetSizePx\}px`;/);
  assert.match(source, /emoji\.style\.height = `\$\{inlineAssetSizePx\}px`;/);
});

test("旧倍率指定のサイズ計算が残っていない", () => {
  const source = loadRendererSource();
  assert.doesNotMatch(source, /fontSizePx \* 1\.08/);
  assert.doesNotMatch(source, /fontSizePx \* 0\.9/);
  assert.doesNotMatch(source, /fontSizePx \* 0\.85/);
});
