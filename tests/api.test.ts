import assert from "node:assert/strict";
import test from "node:test";

import {
  allIpc,
  ancestors,
  byVersion,
  countByType,
  DATA_VERSION,
  lookup,
  searchByName,
} from "../src/index.ts";
import { ipcOfSei, seiOfIpc, seiRuleById, seiRulesByCode } from "../src/sei.ts";

test("lookup finds entries across levels", () => {
  assert.equal(lookup("A")?.type, "部");
  assert.ok(lookup("A")?.name.startsWith("A部"));
  assert.equal(lookup("A01")?.type, "大类");
  assert.equal(lookup("A01B")?.type, "小类");
  assert.equal(lookup("A01B1/00")?.type, "主组");
  assert.equal(lookup("A01B1/24")?.type, "分组");
  assert.equal(lookup("H10D")?.type, "小类");
  assert.equal(lookup("A99Z9/99"), undefined);
});

test("ancestors derives the structural chain", () => {
  assert.deepEqual(
    ancestors("A01B1/02").map((e) => e.code),
    ["A", "A01", "A01B", "A01B1/00"],
  );
  assert.deepEqual(
    ancestors("A01B").map((e) => e.code),
    ["A", "A01"],
  );
  assert.deepEqual(
    ancestors("H10D30/02").map((e) => e.code),
    ["H", "H10", "H10D", "H10D30/00"],
  );
  assert.deepEqual(ancestors("A"), []);
  assert.deepEqual(ancestors("NOPE99"), []);
});

test("searchByName filters by term and type", () => {
  const subclasses = searchByName("半导体", { type: "小类" });
  assert.ok(subclasses.some((e) => e.code === "H10D"));
  assert.ok(subclasses.every((e) => e.name.includes("半导体")));
  assert.deepEqual(searchByName("不存在的标题XYZ"), []);
});

test("byVersion filters exactly", () => {
  const entries = byVersion("2026.01");
  assert.equal(entries.length, 636);
  assert.ok(entries.every((e) => e.version === "2026.01"));
  assert.equal(DATA_VERSION, "2026.01");
});

test("countByType sums to the total", () => {
  const counts = countByType();
  const total =
    counts.部 + counts.大类 + counts.小类 + counts.主组 + counts.分组;
  assert.equal(total, allIpc().length);
});

test("sei subpath queries", () => {
  assert.equal(seiRuleById(1)?.seiCode, "1.1");
  assert.ok(seiRulesByCode("1.1").length > 1);
  assert.equal(seiRuleById(99999), undefined);
  assert.deepEqual(seiRulesByCode("9.9"), []);

  const mapped = seiOfIpc("A01B");
  assert.ok(mapped.some((r) => r.id === 33));
  assert.ok(mapped.every((r) => r.seiName.length > 0));
  assert.deepEqual(seiOfIpc("NOPE99"), []);

  const ipcBack = ipcOfSei("2.1");
  assert.ok(ipcBack.some((e) => e.code === "A01B"));
  assert.ok(ipcBack.every((e) => lookup(e.code) !== undefined));
  const backAgain = ipcBack.flatMap((e) => seiOfIpc(e.code));
  assert.ok(backAgain.some((r) => r.seiCode === "2.1"));
});
