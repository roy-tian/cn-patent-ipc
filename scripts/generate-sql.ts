// 把 render-sql.ts 渲染出的种子写入 sql/postgresql/*.sql。
// 生成物,不要手改;数据修订请改 JSONL 后运行:npm run generate:sql
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { renderSql, repoRoot } from "./render-sql.ts";

const outDir = join(repoRoot, "sql", "postgresql");
mkdirSync(outDir, { recursive: true });
for (const { file, rows, sql } of renderSql()) {
  writeFileSync(join(outDir, file), sql);
  console.log(`generated sql/postgresql/${file}: ${rows} rows`);
}
