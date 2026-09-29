# cn-patent-ipc

[![npm](https://img.shields.io/npm/v/cn-patent-ipc)](https://www.npmjs.com/package/cn-patent-ipc)
![node](https://img.shields.io/node/v/cn-patent-ipc)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![module](https://img.shields.io/badge/module-ESM%20%7C%20CJS-blue)
![types](https://img.shields.io/npm/types/cn-patent-ipc)
[![license](https://img.shields.io/npm/l/cn-patent-ipc)](LICENSE)

The Chinese edition of the International Patent Classification (IPC) as an npm
package: Chinese titles and effective editions (1985.01 → 2026.01), plus
CNIPA's strategic emerging industries (SEI) mapping, a typed lookup API and
PostgreSQL seeds. [中文](README.md)

- IPC: 79,978 entries, that is 8 部 (sections) · 132 大类 (classes) · 655 小类
  (subclasses) · 7,668 主组 (main groups) · 71,515 分组 (subgroups)
- SEI: 321 rules over 40 industry codes, 34,598 IPC↔SEI mappings
- Companion package: [`cn-divisions`](https://www.npmjs.com/package/cn-divisions),
  China's administrative divisions with pinyin

## Install

```bash
npm install cn-patent-ipc
```

Release notes and upgrade steps: [CHANGELOG.md](CHANGELOG.md).

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
// { code: "A01B1/24", type: "分组", level: 1, name: "处理草地或草坪用的犁", version: "2006.01" }

ancestors("A01B1/24").map((e) => e.code); // ["A", "A01", "A01B", "A01B1/00"]
searchByName("半导体", { type: "小类" }); // title substring search, includes H10D
byVersion("2026.01"); // entries effective in the 2026.01 edition
countByType(); // entry count per level
```

- `ancestors` derives the chain structurally, down to the main group. Nesting
  between subgroups isn't recorded in the data. Unknown codes return `[]`.
- `searchByName` throws a `TypeError` for an empty or whitespace-only term.
- Entries are frozen and typed `readonly`. `allIpc()` returns the shared array;
  the other functions return new arrays.

## SEI API

```ts
import { seiOfIpc, ipcOfSei, seiRulesByCode } from "cn-patent-ipc/sei";

seiOfIpc("A01B"); // SEI rules that hit this IPC code
ipcOfSei("2.1"); // IPC entries mapped to industry code 2.1
seiRulesByCode("1.1"); // all keyword rules of this industry code
```

The mapping matches exact codes only. For subclass-level coverage, expand it
with `ancestors` or `allIpc`.

## Raw data and SQL seeds

- `cn-patent-ipc/data/{ipc,sei,ipc-sei}.jsonl`: canonical data, one JSON object
  per line, sorted.
- `cn-patent-ipc/sql/postgresql/{patent_ipc,patent_sei,patent_ipc_sei}.sql`:
  PostgreSQL seeds that create their own tables and indexes. Load `patent_ipc`
  and `patent_sei` before `patent_ipc_sei`.

The seeds can be re-run: they upsert by primary key, so a newer seed updates
changed rows, but they never delete rows. If you create the tables yourself,
`code` and `id` need a primary key or unique constraint. Get a file's path with
`require.resolve("cn-patent-ipc/sql/postgresql/patent_ipc.sql")`, using
`createRequire` in ESM.

## License

MIT. Data sources, known quirks and exclusions:
[NOTICE_en.md](NOTICE_en.md).
