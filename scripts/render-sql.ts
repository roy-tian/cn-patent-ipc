// 从 data/*.jsonl 渲染 sql/postgresql/*.sql 的内容(表名与列名对齐下游 TFS 的种子格式)。
// 只渲染不写盘:generate-sql.ts 负责落盘,tests/data.test.ts 用它校验已提交的 SQL
// 与 JSONL 逐字节一致(只比行数的话,只改标题而忘了重新生成也能过测试)。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { IpcEntry, IpcSeiMapping, SeiRule } from "../src/types.ts";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = 1000;

const read = <T>(file: string): T[] =>
  readFileSync(join(repoRoot, "data", file), "utf-8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);

const q = (value: string | null): string =>
  value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
const n = (value: number | null): string =>
  value === null ? "NULL" : String(value);

// 表结构与索引:让 sql/postgresql/*.sql 自带 DDL,可独立导入 PostgreSQL。
// 注意先导 patent_ipc/patent_sei,再导 patent_ipc_sei(有外键依赖)。
const DDL: Record<string, string> = {
  patent_ipc: `CREATE TABLE IF NOT EXISTS patent_ipc (
  "code" text PRIMARY KEY,
  "type" text NOT NULL CHECK ("type" IN ('部', '大类', '小类', '主组', '分组')),
  "level" integer,
  "name" text NOT NULL,
  "version" text
);
CREATE INDEX IF NOT EXISTS patent_ipc_type_idx ON patent_ipc ("type");
CREATE INDEX IF NOT EXISTS patent_ipc_version_idx ON patent_ipc ("version");
`,
  patent_sei: `CREATE TABLE IF NOT EXISTS patent_sei (
  "id" integer PRIMARY KEY,
  "sei_code" text NOT NULL,
  "sei_name" text NOT NULL,
  "keywords" text
);
CREATE INDEX IF NOT EXISTS patent_sei_code_idx ON patent_sei ("sei_code");
`,
  patent_ipc_sei: `-- Requires patent_ipc.sql and patent_sei.sql to be loaded first (FK dependencies).
CREATE TABLE IF NOT EXISTS patent_ipc_sei (
  "ipc_code" text NOT NULL REFERENCES patent_ipc ("code") ON DELETE CASCADE,
  "sei_id" integer NOT NULL REFERENCES patent_sei ("id") ON DELETE CASCADE,
  PRIMARY KEY ("ipc_code", "sei_id")
);
CREATE INDEX IF NOT EXISTS patent_ipc_sei_sei_id_idx ON patent_ipc_sei ("sei_id");
`,
};

export interface RenderedSql {
  /** 输出文件名,如 "patent_ipc.sql"。 */
  file: string;
  rows: number;
  sql: string;
}

// 建表用 IF NOT EXISTS,插入用 ON CONFLICT 按主键覆盖为本版数据:同一份种子可
// 重复导入,新版种子也能直接覆盖旧版(只增改,不删除本版已不存在的行)。
// 不包 BEGIN/COMMIT:迁移工具多半自带事务,嵌套的 COMMIT 会提前提交外层事务;
// 单条 INSERT 本身是原子的,中途失败后重跑即可。
function render(
  table: string,
  header: string,
  columns: string[],
  key: string[],
  rows: string[][],
): RenderedSql {
  const quoted = (cols: string[]): string =>
    cols.map((c) => `"${c}"`).join(", ");
  const updates = columns
    .filter((c) => !key.includes(c))
    .map((c) => `"${c}" = EXCLUDED."${c}"`);
  const onConflict =
    updates.length > 0
      ? `ON CONFLICT (${quoted(key)}) DO UPDATE SET ${updates.join(", ")}`
      : "ON CONFLICT DO NOTHING";
  const chunks = [
    `-- Generated from data/ — do not edit by hand.\n-- Regenerate with: npm run generate:sql\n-- Safe to re-run: rows are upserted by primary key; rows absent from this seed are not deleted.\n-- ${header}\n\n${DDL[table]}`,
  ];
  for (let i = 0; i < rows.length; i += BATCH) {
    const values = rows
      .slice(i, i + BATCH)
      .map((row) => `(${row.join(", ")})`)
      .join(",\n");
    chunks.push(
      `INSERT INTO ${table} (${quoted(columns)}) VALUES\n${values}\n${onConflict};\n`,
    );
  }
  return { file: `${table}.sql`, rows: rows.length, sql: chunks.join("\n") };
}

/** 渲染全部三份种子 SQL,顺序即导入顺序。 */
export function renderSql(): RenderedSql[] {
  const ipc = read<IpcEntry>("ipc.jsonl");
  const sei = read<SeiRule>("sei.jsonl");
  const mapping = read<IpcSeiMapping>("ipc-sei.jsonl");
  return [
    render(
      "patent_ipc",
      "IPC classification: code PK, type (部/大类/小类/主组/分组), level (0 main group, 1-9 subgroup depth; NULL for 部/大类/小类 and some subgroups), name, version (effective edition)",
      ["code", "type", "level", "name", "version"],
      ["code"],
      ipc.map((e) => [
        q(e.code),
        q(e.type),
        n(e.level),
        q(e.name),
        q(e.version),
      ]),
    ),
    render(
      "patent_sei",
      "SEI classification rules: id PK, sei_code, sei_name, keywords (nullable)",
      ["id", "sei_code", "sei_name", "keywords"],
      ["id"],
      sei.map((r) => [String(r.id), q(r.seiCode), q(r.seiName), q(r.keywords)]),
    ),
    render(
      "patent_ipc_sei",
      "IPC to SEI mapping: (ipc_code, sei_id) composite PK",
      ["ipc_code", "sei_id"],
      ["ipc_code", "sei_id"],
      mapping.map((m) => [q(m.ipcCode), String(m.seiId)]),
    ),
  ];
}
