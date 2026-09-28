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
    ancestors("H10D30/01").map((e) => e.code),
    ["H", "H10", "H10D", "H10D30/00"],
  );
  assert.deepEqual(ancestors("A"), []);
  assert.deepEqual(ancestors("NOPE99"), []);
  // 前缀结构存在但代码本身不在字典中 → 必须返回空数组,而非拼出的伪链。
  assert.deepEqual(ancestors("A01B1/999"), []);
  // 分组不存在时,其真实存在的主组链也不应返回。
  assert.deepEqual(ancestors("H10D99/99"), []);
});

test("searchByName filters by term and type", () => {
  const subclasses = searchByName("半导体", { type: "小类" });
  assert.ok(subclasses.some((e) => e.code === "H10D"));
  assert.ok(subclasses.every((e) => e.name.includes("半导体")));
  assert.deepEqual(searchByName("不存在的标题XYZ"), []);
});

test("searchByName rejects empty or whitespace terms", () => {
  assert.throws(() => searchByName(""), TypeError);
  assert.throws(() => searchByName("   "), TypeError);
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

test("titles rebuilt from CNIPA 2026.01 PDFs (regression pins)", () => {
  // 原种子转储曾发生相邻条目串位/附注并入/截断;标题已于 v0.2.0 重建
  assert.equal(
    lookup("A01B")?.name,
    "农业或林业的整地；一般农业机械或农具的部件、零件或附件（用于播种、种植或施厩肥的开挖沟穴或覆盖沟穴入A01C5/00；可变换成整地设备或能够整地的割草机入A01D42/04；与整地机具联合的割草机入A01D43/12；工程目的的整地入E01，E02，E21）",
  );
  assert.equal(
    lookup("H01B")?.name,
    "电缆；导体；绝缘体；导电、绝缘或介电材料的选择（磁性材料的选择入H01F1/00；波导管入H01P）",
  );
  assert.equal(
    lookup("H01B1/00")?.name,
    "按导电材料特性区分的导体或导电物体；用作导体的材料选择（按材料特性区分的超导或高导导体、电缆或传输线入H01B12／00）〔4〕",
  );
  assert.equal(lookup("H04L9/06")?.name, "保密或安全通信装置；网络安全协议");
  assert.equal(lookup("C09J7/00")?.name, "薄膜或薄片状的粘合剂");
  assert.equal(lookup("B64U")?.name, "无人驾驶飞行器[UAV]；为此的设备");
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
