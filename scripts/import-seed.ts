// 一次性导入:解析上游三份种子 SQL → data/{ipc,sei,ipc-sei}.jsonl。
// 用法:
//   node scripts/import-seed.ts --ipc=<patent-ipc.sql> --sei=<patent-sei.sql> --mapping=<patent-ipc-sei.sql>
//
// 数据逐行原样保留(含 8 条空名称条目,见 NOTICE.md);仅做格式转换与完整性校验。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface IpcRow {
  code: string;
  type: string;
  level: number | null;
  name: string;
  version: string | null;
}

interface SeiRow {
  id: number;
  seiCode: string;
  seiName: string;
  keywords: string | null;
}

interface MappingRow {
  ipcCode: string;
  seiId: number;
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message: string): never {
  console.error(`import-seed: ${message}`);
  process.exit(1);
}

function arg(name: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!found) fail(`missing --${name}=<path>`);
  return found.slice(name.length + 3);
}

// 字段模式:SQL 字符串字面量,内部 '' 为转义单引号。
// OPT 整体捕获(带引号或 NULL),避免 NULL 分支留下 undefined 的内层组。
const TEXT = `'((?:[^']|'')*)'`;
const OPT = `('(?:[^']|'')*'|NULL)`;
const IPC_RE = new RegExp(
  `^\\(${TEXT}, ${TEXT}, ${OPT}, ${TEXT}, ${OPT}\\)[,;]?$`,
);
const SEI_RE = new RegExp(`^\\((\\d+), ${TEXT}, ${TEXT}, ${OPT}\\)[,;]?$`);
const MAPPING_RE = new RegExp(`^\\(${TEXT}, (\\d+)\\)[,;]?$`);

function parseRows<T>(
  source: string,
  pattern: RegExp,
  convert: (m: RegExpExecArray) => T,
): T[] {
  const rows: T[] = [];
  const lines = readFileSync(source, "utf-8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("(")) {
      const match = pattern.exec(line);
      if (!match)
        fail(`unparseable row at ${source}:${i + 1}: ${line.slice(0, 120)}`);
      rows.push(convert(match));
    }
  }
  return rows;
}

const unquote = (raw: string): string => raw.replaceAll("''", "'");
const nullable = (raw: string): string | null =>
  raw === "NULL" ? null : unquote(raw.slice(1, -1));

const ipcRows = parseRows(arg("ipc"), IPC_RE, (m): IpcRow => ({
  code: unquote(m[1]),
  type: unquote(m[2]),
  level: m[3] === "NULL" ? null : Number(nullable(m[3])),
  name: unquote(m[4]),
  version: nullable(m[5]),
}));
const seiRows = parseRows(arg("sei"), SEI_RE, (m): SeiRow => ({
  id: Number(m[1]),
  seiCode: unquote(m[2]),
  seiName: unquote(m[3]),
  keywords: nullable(m[4]),
}));
const mappingRows = parseRows(arg("mapping"), MAPPING_RE, (m): MappingRow => ({
  ipcCode: unquote(m[1]),
  seiId: Number(m[2]),
}));

const IPC_TYPES = new Set(["部", "大类", "小类", "主组", "分组"]);
const ipcCodes = new Set<string>();
for (const row of ipcRows) {
  if (!IPC_TYPES.has(row.type))
    fail(`ipc ${row.code} has unknown type ${row.type}`);
  if (ipcCodes.has(row.code)) fail(`duplicate ipc code ${row.code}`);
  ipcCodes.add(row.code);
}
const emptyNames = ipcRows.filter((r) => r.name === "").map((r) => r.code);

const seiIds = new Set<number>();
for (const row of seiRows) {
  if (seiIds.has(row.id)) fail(`duplicate sei id ${row.id}`);
  seiIds.add(row.id);
  if (!row.seiCode) fail(`sei ${row.id} has empty seiCode`);
}

const pairs = new Set<string>();
for (const row of mappingRows) {
  if (!ipcCodes.has(row.ipcCode))
    fail(`mapping references unknown ipc ${row.ipcCode}`);
  if (!seiIds.has(row.seiId))
    fail(`mapping references unknown sei ${row.seiId}`);
  const key = `${row.ipcCode}#${row.seiId}`;
  if (pairs.has(key)) fail(`duplicate mapping ${key}`);
  pairs.add(key);
}

ipcRows.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
seiRows.sort((a, b) => a.id - b.id);
mappingRows.sort((a, b) =>
  a.ipcCode === b.ipcCode ? a.seiId - b.seiId : a.ipcCode < b.ipcCode ? -1 : 1,
);

const write = (file: string, rows: unknown[]): void => {
  mkdirSync(join(repoRoot, "data"), { recursive: true });
  writeFileSync(
    join(repoRoot, "data", file),
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
};
write("ipc.jsonl", ipcRows);
write("sei.jsonl", seiRows);
write("ipc-sei.jsonl", mappingRows);

const typeCounts = new Map<string, number>();
for (const row of ipcRows)
  typeCounts.set(row.type, (typeCounts.get(row.type) ?? 0) + 1);
const versions = new Map<string, number>();
for (const row of ipcRows) {
  const key = row.version ?? "NULL";
  versions.set(key, (versions.get(key) ?? 0) + 1);
}

console.log(
  `ipc:      ${ipcRows.length} rows  (${[...typeCounts].map(([t, n]) => `${t}:${n}`).join(" ")})`,
);
console.log(
  `sei:      ${seiRows.length} rows, distinct codes: ${new Set(seiRows.map((r) => r.seiCode)).size}`,
);
console.log(`mapping:  ${mappingRows.length} rows`);
console.log(
  `versions: ${[...versions.entries()]
    .sort()
    .map(([v, n]) => `${v}(${n})`)
    .join(" ")}`,
);
if (emptyNames.length > 0) {
  console.log(`empty names (${emptyNames.length}): ${emptyNames.join(", ")}`);
}
