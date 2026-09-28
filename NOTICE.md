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
dumps of those publications. As of v0.1.2, **Chinese titles were rebuilt from
the official CNIPA 2026.01 PDFs** (all 8 sections): the original seed dump
had systematically misaligned titles in ~12% of entries (adjacent-entry
carry-over, notes and subclass indices merged into titles, truncations).
`level` and `version` fields are still taken from the original seed; only
`name` was rebuilt and verified entry-by-entry against the PDFs.

## Known data quirks (carried verbatim)

- **2 entries have empty titles**: `C12P19/64`, `H02K21/24`. Both are printed
  without a title in the official CNIPA 2026.01 PDF and are kept as-is.
  (Six further empty-title entries from the original dump were repaired
  during the 2026.01 title rebuild.)
- **The `H01L` subtree is absent.** IPC deleted the subclass 半导体器件 in
  the 2020.01 revision and redistributed its content into the new `H10*`
  class (847 entries: H10B, H10D, H10F, …). This is confirmed against both
  the CNIPA 2026.01 H-section table and WIPO's IPC-2026.01 master files
  (EN/FR), which contain no `H01L` symbol. Queries for `H01L` return
  nothing.
- 257 entries carry a `NULL` version tag.
- The mapping table matches **exact** IPC codes; hierarchical expansion (a
  subclass mapping covering all its groups) is left to the consumer.
- Titles were extracted from PDF text; a small number may retain minor
  layout artifacts (e.g. an unclosed parenthesis where the PDF itself drops
  a line, or a stray edition marker). `C07C409/02` and siblings genuinely
  begin with `-O-O-` (peroxide linkage), which is not an artifact.

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
