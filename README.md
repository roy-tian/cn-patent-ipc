# cn-patent-ipc

Chinese-edition IPC patent classification as a zero-dependency dataset —
**79,972 entries** (sections, classes, subclasses, groups) with Chinese titles
and effective editions (1985.01 → 2026.01), plus the CNIPA
strategic-emerging-industry (**SEI**) mapping, and a typed lookup API with
ready-to-run PostgreSQL seeds.

中文版专利国际专利分类(IPC)数据包:约 8 万条分类号(部/大类/小类/主组/分组),
含中文标题与生效版次,附战略性新兴产业(SEI)参照映射,零运行时依赖。
[中文说明](README_zh.md)

- IPC: 8 部 · 132 大类 · 655 小类 · 7,667 主组 · 71,510 分组
- SEI: 321 rules over 40 industry codes; 34,598 IPC↔SEI mappings
- Companion package:
  [`cn-divisions`](https://www.npmjs.com/package/cn-divisions) — China
  administrative divisions with pinyin

## Install

```bash
npm install cn-patent-ipc
```

Node.js ≥ 18. ESM and CJS are both supported.

## IPC API

```ts
import {
  allIpc,
  lookup,
  ancestors,
  searchByName,
  byVersion,
  countByType,
} from "cn-patent-ipc";

lookup("A01B1/24");
// { code: "A01B1/24", type: "分组", level: 2, name: "…", version: "2006.01" }

ancestors("A01B1/24").map((e) => e.code);
// [ "A", "A01", "A01B", "A01B1/00" ]  — structural chain down to the main group

searchByName("半导体", { type: "小类" }); // includes H10D
byVersion("2026.01"); // entries effective in the 2026.01 edition
countByType(); // { 部: 8, 大类: 132, 小类: 655, 主组: 7667, 分组: 71510 }
```

Note: `ancestors` derives the chain structurally (section → class → subclass →
main group) and returns an empty array for codes that do not exist in the
dictionary. Subgroup-to-subgroup nesting is not recorded in IPC data and
cannot be derived. `searchByName` throws a `TypeError` for empty or
whitespace-only terms. Entries and arrays returned by the API are frozen —
mutable access throws in strict mode.

## SEI API (`cn-patent-ipc/sei`)

```ts
import { seiOfIpc, ipcOfSei, seiRulesByCode } from "cn-patent-ipc/sei";

seiOfIpc("A01B"); // SEI rules hitting this exact IPC code
ipcOfSei("2.1"); // IPC entries mapped to industry code "2.1"
seiRulesByCode("1.1"); // keyword rules — one industry code has several
```

Mapping matches **exact** IPC codes; expand hierarchically with `ancestors` /
`allIpc` if you need subclass-level coverage.

## Raw data and SQL seeds

Subpath imports expose the raw files:

- `cn-patent-ipc/data/{ipc,sei,ipc-sei}.jsonl` — canonical datasets, one JSON
  object per line, sorted
- `cn-patent-ipc/sql/postgresql/{patent_ipc,patent_sei,patent_ipc_sei}.sql` —
  self-contained seeds with `CREATE TABLE IF NOT EXISTS` DDL, indexes and
  batched `INSERT`s; load `patent_ipc` and `patent_sei` before
  `patent_ipc_sei` (FK dependencies). Regenerate with `npm run generate:sql`

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sqlPath = require.resolve("cn-patent-ipc/sql/postgresql/patent_ipc.sql");
```

## Updating the data

Edit the JSONL, regenerate the SQL, bump the version, and update `DATA_VERSION`
in `src/types.ts` to the newest edition present. Tests pin row counts, type
counts, foreign keys and the JSONL ↔ SQL row counts, so an inconsistent update
fails CI.

## License

MIT for code and this compilation. Data provenance (WIPO/CNIPA sources),
quirks and exclusions: [NOTICE.md](NOTICE.md).
