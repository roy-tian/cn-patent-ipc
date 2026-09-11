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

function emit(
  file: string,
  header: string,
  rows: string[][],
  columns: string,
): void {
  const chunks = [
    `-- Generated from data/ — do not edit by hand.\n-- Regenerate with: npm run generate:sql\n-- ${header}\n`,
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
