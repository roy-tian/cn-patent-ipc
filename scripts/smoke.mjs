// 冒烟测试:分别以 CJS 与 ESM 加载 dist 的两个入口,各做一次最小查询。
// 用纯 JS 而非 .ts:CI 要在 engines 声明的 Node 18/20/22 上跑它,这些版本不支持类型剥离。
// 用法:npm run build && node scripts/smoke.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const cjsRequire = createRequire(import.meta.url);

const cjsIndex = cjsRequire("../dist/index.cjs");
const cjsSei = cjsRequire("../dist/sei.cjs");
assert.ok(cjsIndex.lookup("A01B"), "cjs: lookup('A01B') returned nothing");
assert.ok(cjsSei.allSeiRules().length > 0, "cjs: allSeiRules() is empty");
// 两个 CJS 入口须共用同一份数据缓存(tsup 的 CJS splitting),否则数据会解析两遍
assert.ok(
  cjsSei.ipcOfSei("2.1").find((e) => e.code === "A01B") ===
    cjsIndex.lookup("A01B"),
  "cjs: index.cjs and sei.cjs do not share the data cache",
);

const esmIndex = await import("../dist/index.js");
const esmSei = await import("../dist/sei.js");
assert.ok(esmIndex.lookup("A01B"), "esm: lookup('A01B') returned nothing");
assert.ok(esmSei.allSeiRules().length > 0, "esm: allSeiRules() is empty");

console.log(`smoke ok (cjs + esm) on Node ${process.version}`);
