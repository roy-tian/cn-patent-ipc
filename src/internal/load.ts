import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// __dirname 在 CJS 产物中存在;ESM 下 import.meta.url 才可用,两者择一。
function moduleDir(): string {
  if (typeof __dirname === "string") {
    return __dirname;
  }
  return dirname(fileURLToPath(import.meta.url));
}

// 从模块所在目录逐级向上定位 data/,兼容源码运行、tsup 的 ESM/CJS 产物、
// 以及被安装到 node_modules 的包根目录。
function findDataDir(): string {
  let dir = moduleDir();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "data", "ipc.jsonl"))) {
      return join(dir, "data");
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    "cn-patent-ipc: data/ipc.jsonl not found relative to the package. The npm package may be broken.",
  );
}

const cache = new Map<string, unknown[]>();

/** 读取并缓存一个 JSONL 数据文件,首次调用时解析。 */
export function loadJsonl<T>(file: string): T[] {
  if (!cache.has(file)) {
    const raw = readFileSync(join(findDataDir(), file), "utf-8");
    cache.set(
      file,
      raw
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line)),
    );
  }
  return cache.get(file) as T[];
}
