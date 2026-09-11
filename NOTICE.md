# Data provenance and normalization — 数据出处与规范化说明

## What this data is

Three related datasets, distributed as JSONL plus generated PostgreSQL seeds:

| File                 | Rows   | Content                                                                                                                                                                     |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/ipc.jsonl`     | 79,972 | Chinese-edition IPC classification entries: 8 部 (sections A–H), 132 大类, 655 小类, 7,667 主组, 71,510 分组, each with its Chinese title and the edition it took effect in |
| `data/sei.jsonl`     | 321    | 战略性新兴产业 (Strategic Emerging Industries, SEI) classification rules — 40 industry codes, each with one or more keyword rules                                           |
| `data/ipc-sei.jsonl` | 34,598 | IPC ↔ SEI mapping (which IPC codes belong to which SEI industry)                                                                                                            |

`version` values span **1985.01 through 2026.01**: each entry is tagged with the
IPC edition in which it took effect (or was last amended). `DATA_VERSION` is
exported as the newest edition present, currently `2026.01`.

## Sources

- IPC classification (Chinese titles): 国家知识产权局 (CNIPA) published
  国际专利分类表 (Chinese edition of WIPO's International Patent
  Classification). The underlying classification scheme is published by WIPO
  under CC BY 4.0; the Chinese edition is CNIPA's official publication.
- SEI classification and IPC↔SEI mapping: 国家知识产权局《战略性新兴产业分类与
  国际专利分类参照关系表》, an official public reference document.

The datasets in this repository were derived from a downstream project's seed
dumps of those publications.

## Known data quirks (carried verbatim)

- **8 entries have empty titles**: `B62D6/00`, `B64U`, `C10L1/2387`,
  `C12N9/04`, `C12N9/48`, `C12N9/78`, `C12P19/44`, `H02K21/24`. They exist in
  the upstream dump with empty names and are kept as-is.
- **The `H01L` subtree is absent.** The subclass 半导体器件 was retired in
  newer IPC editions; its content lives under the `H10*` subclasses (847
  entries: H10B, H10D, H10F, …). Queries for `H01L` return nothing.
- 257 entries carry a `NULL` version tag.
- The mapping table matches **exact** IPC codes; hierarchical expansion (a
  subclass mapping covering all its groups) is left to the consumer.

## What is NOT included

Retired legacy codes that existed only in a downstream application's database
(8 withdrawn subgroup codes used by pre-2020 filings) are **not** part of this
dataset. If you need them, add them locally.

## Regenerating artifacts

- `sql/postgresql/*.sql` files are generated from the JSONL
  (`npm run generate:sql`). Never edit them by hand. Tables: `patent_ipc`,
  `patent_sei`, `patent_ipc_sei`.
- Re-importing from upstream SQL dumps: `npm run import:seed -- --ipc=<file>
--sei=<file> --mapping=<file>`. The import validates uniqueness and mapping
  foreign keys, and fails loudly on inconsistent input.

## License

Code: MIT (see [LICENSE](LICENSE)).
Data: the IPC scheme itself is WIPO's, published under CC BY 4.0; CNIPA's
Chinese edition and the SEI reference table are official government
publications. This compilation is distributed under MIT. No warranty is given
as to fitness for any particular use — verify against official publications
for legal purposes.
