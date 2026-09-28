import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { allIpc, countByType } from "../src/index.ts";
import { allSeiRules } from "../src/sei.ts";
import type { IpcEntry, IpcSeiMapping, SeiRule } from "../src/types.ts";

const ipc = allIpc();

const readJsonl = <T>(file: string): T[] =>
  readFileSync(new URL(`../data/${file}`, import.meta.url), "utf-8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);

test("snapshot size and per-type counts", () => {
  assert.equal(ipc.length, 79_972);
  assert.deepEqual(countByType(), {
    部: 8,
    大类: 132,
    小类: 655,
    主组: 7_667,
    分组: 71_510,
  });
  assert.equal(allSeiRules().length, 321);
  assert.equal(readJsonl<IpcSeiMapping>("ipc-sei.jsonl").length, 34_598);
});

test("codes are unique and sorted; every entry has a known type", () => {
  const codes = new Set<string>();
  for (let i = 1; i < ipc.length; i++) {
    assert.ok(ipc[i - 1].code < ipc[i].code, `order broken at ${ipc[i].code}`);
  }
  for (const e of ipc) {
    assert.ok(!codes.has(e.code), `duplicate ${e.code}`);
    codes.add(e.code);
    assert.ok(["部", "大类", "小类", "主组", "分组"].includes(e.type));
  }
});

test("structural ancestor prefixes exist for class/subclass entries", () => {
  // 预建索引后 O(n) 检查;勿在循环里用 ipc.some(),都定 O(n²) 会把 CI 拖到分钟级。
  const codes = new Set(ipc.map((e) => e.code));
  for (const e of ipc) {
    if (e.type === "大类") {
      assert.ok(codes.has(e.code.slice(0, 1)), `orphan ${e.code}`);
    } else if (e.type === "小类") {
      assert.ok(codes.has(e.code.slice(0, 3)), `orphan ${e.code}`);
    } else if (e.type === "主组" || e.type === "分组") {
      assert.ok(codes.has(e.code.slice(0, 4)), `orphan ${e.code}`);
    }
  }
});

test("mapping foreign keys are intact", () => {
  const ipcCodes = new Set(ipc.map((e) => e.code));
  const seiIds = new Set(allSeiRules().map((r) => r.id));
  const seen = new Set<string>();
  for (const m of readJsonl<IpcSeiMapping>("ipc-sei.jsonl")) {
    assert.ok(ipcCodes.has(m.ipcCode), `unknown ipc ${m.ipcCode}`);
    assert.ok(seiIds.has(m.seiId), `unknown sei ${m.seiId}`);
    const key = `${m.ipcCode}#${m.seiId}`;
    assert.ok(!seen.has(key), `duplicate mapping ${key}`);
    seen.add(key);
  }
});

test("sei rules: unique ids, non-empty codes, one code has multiple rules", () => {
  const rules = readJsonl<SeiRule>("sei.jsonl");
  const ids = new Set(rules.map((r) => r.id));
  assert.equal(ids.size, rules.length);
  assert.ok(rules.every((r) => r.seiCode.length > 0));
  const byCode = new Map<string, number>();
  for (const r of rules)
    byCode.set(r.seiCode, (byCode.get(r.seiCode) ?? 0) + 1);
  assert.equal(byCode.size, 40);
  assert.ok([...byCode.values()].some((n) => n > 1));
});

test("empty-name entries are carried verbatim", () => {
  // 仅这两条在 CNIPA 2026.01 版 PDF 中确实无标题(其余 6 条空名已由标题重建修复)
  const expected = ["C12P19/64", "H02K21/24"];
  const empty = ipc.filter((e) => e.name === "").map((e) => e.code);
  assert.deepEqual(empty, expected);
});

function parseSqlRows(sqlFile: string, rowPattern: RegExp): number {
  const sql = readFileSync(
    new URL(`../sql/postgresql/${sqlFile}`, import.meta.url),
    "utf-8",
  );
  return [...sql.matchAll(rowPattern)].length;
}

test("committed SQL matches the JSONL payloads (row counts)", () => {
  const ipcRow =
    /\('[^']*(?:''[^']*)*', '[^']*(?:''[^']*)*', (?:NULL|\d+), '(?:[^']|'')*', (?:NULL|'(?:[^']|'')*')\)[,;]/g;
  const seiRow =
    /\(\d+, '(?:[^']|'')*', '(?:[^']|'')*', (?:NULL|'(?:[^']|'')*')\)[,;]/g;
  const mappingRow = /\('(?:[^']|'')*', \d+\)[,;]/g;
  assert.equal(
    parseSqlRows("patent_ipc.sql", ipcRow),
    readJsonl<IpcEntry>("ipc.jsonl").length,
  );
  assert.equal(
    parseSqlRows("patent_sei.sql", seiRow),
    readJsonl<SeiRule>("sei.jsonl").length,
  );
  assert.equal(
    parseSqlRows("patent_ipc_sei.sql", mappingRow),
    readJsonl<IpcSeiMapping>("ipc-sei.jsonl").length,
  );
});
