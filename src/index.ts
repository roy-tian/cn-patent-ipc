import { ipcByCode, ipcEntries } from "./internal/ipc-index.ts";
import { DATA_VERSION, type IpcEntry, type IpcType } from "./types.ts";

export * from "./types.ts";

/** 全量 IPC 条目,按分类号升序。返回的是共享冻结数组,请勿修改。 */
export function allIpc(): readonly IpcEntry[] {
  return ipcEntries();
}

/** 按分类号精确查询。 */
export function lookup(code: string): IpcEntry | undefined {
  return ipcByCode().get(code);
}

/**
 * 结构化祖先链:部 → 大类 → 小类 → 主组。
 * 分组到分组之间的层级在 IPC 数据中没有父级字段,无法推导,故分组只回溯到主组。
 * 代码在字典中不存在(含传入 "A" 这类已是"部"的代码)时返回空数组;
 * 只返回字典中真实存在的条目。
 */
export function ancestors(code: string): IpcEntry[] {
  if (code.length < 2 || !ipcByCode().has(code)) return [];
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
    .map((c) => ipcByCode().get(c))
    .filter((e): e is IpcEntry => e !== undefined);
}

/**
 * 按标题子串搜索,可限定层级;按分类号升序。
 * term 为空串或纯空白时抛出 TypeError——空串会匹配全部约 8 万条,
 * 几乎可以肯定是调用方的输入未校验。
 */
export function searchByName(
  term: string,
  options?: { type?: IpcType },
): IpcEntry[] {
  const needle = term.trim();
  if (needle === "") {
    throw new TypeError(
      "searchByName: term must be a non-empty string (got empty or whitespace)",
    );
  }
  return ipcEntries().filter(
    (e) =>
      e.name.includes(needle) &&
      (options?.type === undefined || e.type === options.type),
  );
}

/** 按生效版次精确过滤,如 "2025.01"。 */
export function byVersion(version: string): IpcEntry[] {
  return ipcEntries().filter((e) => e.version === version);
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
  for (const e of ipcEntries()) counts[e.type] += 1;
  return counts;
}

export { DATA_VERSION };
