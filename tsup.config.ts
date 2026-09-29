import { defineConfig } from "tsup";

// CJS 侧用函数式 esbuildOptions 把 import.meta.url define 掉,消除 esbuild 的
// empty-import-meta 告警(产物里 CJS 路径本就走 __dirname 分支,该表达式不会
// 执行;实测 esbuild 不会自动改写 import.meta.url,此 define 是必需的)。
//
// CJS 侧另需两项:
// - splitting:让 index.cjs 与 sei.cjs 像 ESM 一样共用一个 chunk。缺了它两个入口
//   各打包一份 src/internal/,同时 require 时数据解析两遍(多占约 48 MB),条目
//   也不是同一对象。tsup 把 CJS 的 splitting 标为实验特性,CI 冒烟测试会校验共享。
// - dts:输出 .d.cts 供 exports 的 require 条件使用。否则 CJS 侧的 TS 用户
//   (module: node16)拿到的是被视为 ESM 的 .d.ts,会报 TS1471。
export default defineConfig([
  {
    entry: { index: "src/index.ts", sei: "src/sei.ts" },
    format: "esm",
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node18",
    platform: "node",
    treeshake: false,
  },
  {
    entry: { index: "src/index.ts", sei: "src/sei.ts" },
    format: "cjs",
    outExtension: () => ({ js: ".cjs" }),
    splitting: true,
    dts: true,
    sourcemap: true,
    target: "node18",
    platform: "node",
    treeshake: false,
    esbuildOptions: (options) => {
      options.define = {
        ...options.define,
        "import.meta.url": "undefined",
      };
    },
  },
]);
