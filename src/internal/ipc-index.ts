import { loadJsonl } from "./load.ts";
import type { IpcEntry } from "../types.ts";

let byCodeCache: ReadonlyMap<string, IpcEntry> | null = null;

/** 全量 IPC 条目(共享缓存,按分类号升序)。 */
export function ipcEntries(): readonly IpcEntry[] {
  return loadJsonl<IpcEntry>("ipc.jsonl");
}

/** code → 条目的共享索引;index 与 sei 两个入口共用,避免各自重复建表。 */
export function ipcByCode(): ReadonlyMap<string, IpcEntry> {
  if (!byCodeCache) {
    byCodeCache = new Map(ipcEntries().map((e) => [e.code, e]));
  }
  return byCodeCache;
}
