import { loadJsonl } from "./internal/load.ts";
import { DATA_VERSION, type IpcEntry, type IpcType } from "./types.ts";

export * from "./types.ts";

let ipcCache: IpcEntry[] | null = null;
let byCodeCache: Map<string, IpcEntry> | null = null;

function load(): IpcEntry[] {
  if (!ipcCache) {
    ipcCache = loadJsonl<IpcEntry>("ipc.jsonl");
  }
  return ipcCache;
}

function byCode(): Map<string, IpcEntry> {
  if (!byCodeCache) {
    byCodeCache = new Map(load().map((e) => [e.code, e]));
  }
  return byCodeCache;
}

/** 全量 IPC 条目,按分类号升序。 */
export function allIpc(): readonly IpcEntry[] {
  return load().slice();
}

/** 按分类号精确查询。 */
export function lookup(code: string): IpcEntry | undefined {
  return byCode().get(code);
}

/**
 * 结构化祖先链:部 → 大类 → 小类 → 主组。
 * 分组到分组之间的层级在 IPC 数据中没有父级字段,无法推导,故分组只回溯到主组。
 * 代码不存在或已是"部"时返回空数组;只返回字典中真实存在的条目。
 */
export function ancestors(code: string): IpcEntry[] {
  if (code.length < 2) return [];
  const chain: string[] = [code.slice(0, 1)];
  if (code.length >= 3) chain.push(code.slice(0, 3));
  if (code.length >= 4) chain.push(code.slice(0, 4));
  const slash = code.indexOf("/");
  if (slash > 0) {
    const main = `${code.slice(0, slash + 1)}00`;
    if (main !== code) chain.push(main);
  }
  return chain
    .filter((c) => c !== code)
    .map((c) => byCode().get(c))
    .filter((e): e is IpcEntry => e !== undefined);
}

/** 按标题子串搜索,可限定层级;按分类号升序。 */
export function searchByName(
  term: string,
  options?: { type?: IpcType },
): IpcEntry[] {
  const needle = term.trim();
  return load().filter(
    (e) =>
      (needle === "" || e.name.includes(needle)) &&
      (options?.type === undefined || e.type === options.type),
  );
}

/** 按生效版次精确过滤,如 "2025.01"。 */
export function byVersion(version: string): IpcEntry[] {
  return load().filter((e) => e.version === version);
}

/** 各层级条目数。 */
export function countByType(): Record<IpcType, number> {
  const counts: Record<IpcType, number> = {
    部: 0,
    大类: 0,
    小类: 0,
    主组: 0,
    分组: 0,
  };
  for (const e of load()) counts[e.type] += 1;
  return counts;
}

export { DATA_VERSION };
