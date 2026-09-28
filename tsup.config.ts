import { defineConfig } from "tsup";

// CJS 侧用函数式 esbuildOptions 把 import.meta.url define 掉,消除 esbuild 的
// empty-import-meta 告警(产物里 CJS 路径本就走 __dirname 分支,该表达式不会
// 执行;实测 esbuild 不会自动改写 import.meta.url,此 define 是必需的)。
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
