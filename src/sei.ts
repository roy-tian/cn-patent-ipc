import { loadJsonl } from "./internal/load.ts";
import type { IpcEntry, IpcSeiMapping, SeiRule } from "./types.ts";

let seiCache: SeiRule[] | null = null;
let mappingCache: IpcSeiMapping[] | null = null;
let seiByIdCache: Map<number, SeiRule> | null = null;
let mappingByIpcCache: Map<string, IpcSeiMapping[]> | null = null;
let mappingBySeiCache: Map<number, IpcSeiMapping[]> | null = null;

function seiRules(): SeiRule[] {
  if (!seiCache) seiCache = loadJsonl<SeiRule>("sei.jsonl");
  return seiCache;
}

function mappings(): IpcSeiMapping[] {
  if (!mappingCache) mappingCache = loadJsonl<IpcSeiMapping>("ipc-sei.jsonl");
  return mappingCache;
}

function seiById(): Map<number, SeiRule> {
  if (!seiByIdCache) {
    seiByIdCache = new Map(seiRules().map((r) => [r.id, r]));
  }
  return seiByIdCache;
}

function mappingByIpc(): Map<string, IpcSeiMapping[]> {
  if (!mappingByIpcCache) {
    const map = new Map<string, IpcSeiMapping[]>();
    for (const m of mappings()) {
      const list = map.get(m.ipcCode);
      if (list) list.push(m);
      else map.set(m.ipcCode, [m]);
    }
    mappingByIpcCache = map;
  }
  return mappingByIpcCache;
}

function mappingBySei(): Map<number, IpcSeiMapping[]> {
  if (!mappingBySeiCache) {
    const map = new Map<number, IpcSeiMapping[]>();
    for (const m of mappings()) {
      const list = map.get(m.seiId);
      if (list) list.push(m);
      else map.set(m.seiId, [m]);
    }
    mappingBySeiCache = map;
  }
  return mappingBySeiCache;
}

/** 全部 SEI 规则,按 id 升序;同一 seiCode 可有多条关键词规则。 */
export function allSeiRules(): readonly SeiRule[] {
  return seiRules().slice();
}

/** 按 id 精确查一条规则。 */
export function seiRuleById(id: number): SeiRule | undefined {
  return seiById().get(id);
}

/** 按 SEI 产业代码取全部规则,如 "1.1"。 */
export function seiRulesByCode(seiCode: string): SeiRule[] {
  return seiRules().filter((r) => r.seiCode === seiCode);
}

/** IPC 分类号命中的 SEI 规则(精确匹配,参照表不包含层级展开)。 */
export function seiOfIpc(ipcCode: string): SeiRule[] {
  const ids = mappingByIpc().get(ipcCode) ?? [];
  return ids
    .map((m) => seiById().get(m.seiId))
    .filter((r): r is SeiRule => r !== undefined);
}

/** SEI 规则(id 或产业代码)对应的 IPC 条目,按分类号升序去重。 */
export function ipcOfSei(query: number | string): IpcEntry[] {
  const rules =
    typeof query === "number"
      ? [seiById().get(query)].filter((r): r is SeiRule => r !== undefined)
      : seiRulesByCode(query);
  if (rules.length === 0) return [];
  const ipcByCode = new Map(
    loadJsonl<IpcEntry>("ipc.jsonl").map((e) => [e.code, e]),
  );
  const seen = new Set<string>();
  const result: IpcEntry[] = [];
  for (const rule of rules) {
    for (const m of mappingBySei().get(rule.id) ?? []) {
      const entry = ipcByCode.get(m.ipcCode);
      if (entry && !seen.has(entry.code)) {
        seen.add(entry.code);
        result.push(entry);
      }
    }
  }
  result.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  return result;
}
