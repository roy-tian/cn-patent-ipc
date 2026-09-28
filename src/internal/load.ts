import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// __dirname 在 CJS 产物中存在;ESM 下 import.meta.url 才可用,两者择一。
// 注意:esbuild 打包 CJS 时不会改写 import.meta.url(而是替换为 undefined 并
// 告警),因此源码保留 __dirname 优先分支,tsup.config.ts 里再以 define 把
// import.meta.url 置空以消除告警——CJS 路径本就不走该分支。
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

const cache = new Map<string, readonly unknown[]>();

/**
 * 读取并缓存一个 JSONL 数据文件,首次调用时解析。
 * 返回的数组与条目均为冻结对象:数据是共享单例,防止调用方意外篡改缓存。
 */
export function loadJsonl<T>(file: string): readonly T[] {
  if (!cache.has(file)) {
    const raw = readFileSync(join(findDataDir(), file), "utf-8");
    cache.set(
      file,
      Object.freeze(
        raw
          .split("\n")
          .filter((line) => line.length > 0)
          .map((line) => Object.freeze(JSON.parse(line) as T)),
      ),
    );
  }
  return cache.get(file) as readonly T[];
}
