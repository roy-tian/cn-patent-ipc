// 从 data/*.jsonl 生成 sql/postgresql/*.sql(表名与列名对齐下游 TFS 的种子格式)。
// 生成物,不要手改;数据修订请改 JSONL 后运行:npm run generate:sql
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { IpcEntry, IpcSeiMapping, SeiRule } from "../src/types.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
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
// 建表用 IF NOT EXISTS,重复导入不报错;注意先导 patent_ipc/patent_sei,
// 再导 patent_ipc_sei(有外键依赖)。
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

function emit(
  file: string,
  header: string,
  rows: string[][],
  columns: string,
): void {
  const chunks = [
    `-- Generated from data/ — do not edit by hand.\n-- Regenerate with: npm run generate:sql\n-- ${header}\n\n${DDL[file]}`,
  ];
  for (let i = 0; i < rows.length; i += BATCH) {
    const values = rows
      .slice(i, i + BATCH)
      .map((row) => `(${row.join(", ")})`)
      .join(",\n");
    chunks.push(`INSERT INTO ${file} ${columns} VALUES\n${values};\n`);
  }
  const outDir = join(repoRoot, "sql", "postgresql");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${file}.sql`), chunks.join("\n"));
  console.log(`generated sql/postgresql/${file}.sql: ${rows.length} rows`);
}

const ipc = read<IpcEntry>("ipc.jsonl");
const sei = read<SeiRule>("sei.jsonl");
const mapping = read<IpcSeiMapping>("ipc-sei.jsonl");

emit(
  "patent_ipc",
  "IPC classification: code PK, type (部/大类/小类/主组/分组), level (0 mainGroup, 1-9 subgroup depth), name, version (effective edition)",
  ipc.map((e) => [q(e.code), q(e.type), n(e.level), q(e.name), q(e.version)]),
  '("code", "type", "level", "name", "version")',
);
emit(
  "patent_sei",
  "SEI classification rules: id PK, sei_code, sei_name, keywords (nullable)",
  sei.map((r) => [String(r.id), q(r.seiCode), q(r.seiName), q(r.keywords)]),
  '("id", "sei_code", "sei_name", "keywords")',
);
emit(
  "patent_ipc_sei",
  "IPC to SEI mapping: (ipc_code, sei_id) composite PK",
  mapping.map((m) => [q(m.ipcCode), String(m.seiId)]),
  '("ipc_code", "sei_id")',
);
