# Changelog — 更新日志

## 0.1.3

This release repairs a corrupted group in the data, makes the SQL seeds safe to
re-run and fixes several packaging problems. Most users can upgrade without
changes. Read [Upgrading from 0.1.2](#upgrading-from-012) if you use
TypeScript, load the SQL seeds, or store `E01D101/…` codes.

### Data

- Rebuilt the `E01D101/00` indexing group (桥梁的材料组成) from page 11 of the
  CNIPA 2026.01 E-section PDF. The PDF wraps these codes across two lines, and
  the upstream seed had cut off their last digit, which merged 11 entries into 5. The codes `E01D101/0` through `E01D101/4` are gone, and 11 codes from
  `E01D101/00` to `E01D101/40` replace them.
- IPC entries: 79,972 → 79,978 (主组 7,667 → 7,668, 分组 71,510 → 71,515).
  The SEI rules and mapping are unchanged.

### SQL seeds

- Every `INSERT` now upserts by primary key (`ON CONFLICT … DO UPDATE`). A
  seed can be run again, and a newer seed can be loaded over an older one.
  Rows that are no longer in the seed are not deleted.

### Package

- The CommonJS build now shares one data cache between `cn-patent-ipc` and
  `cn-patent-ipc/sei`, as the ESM build already did. Requiring both no longer
  parses the data twice, which cost about 48 MB of heap.
- `require` now resolves to its own `.d.cts` types. TypeScript CommonJS
  projects using `module: node16` no longer fail with TS1471, and
  `moduleResolution: node10` can now find the types of `cn-patent-ipc/sei`.
- The fields of `IpcEntry`, `SeiRule` and `IpcSeiMapping` are now `readonly`,
  matching the frozen objects the API already returned.
- Documented that 1,688 subgroups have a `null` `level` (the data itself is
  unchanged) and fixed the `level` in the README's `lookup` example.
- Corrected the NOTICE on `H01L`: its content moved into `H10` over the
  2023.01, 2025.01 and 2026.01 editions, not in 2020.01.

### Upgrading from 0.1.2

**TypeScript: assigning to an entry field no longer compiles.** Entries were
already frozen, so such an assignment threw at runtime in strict mode, or was
silently ignored otherwise. To change an entry, copy it first. A spread copy
is an ordinary mutable object:

```ts
const entry = { ...lookup("A01B")! };
entry.name = "…";
```

**Stored `E01D101/…` codes.** If your database or records hold one of the
removed codes, map it to its replacement:

| Removed     | Replacement                                                          |
| ----------- | -------------------------------------------------------------------- |
| `E01D101/0` | `E01D101/00` 桥梁的材料组成                                          |
| `E01D101/1` | `E01D101/10` 木材                                                    |
| `E01D101/2` | `E01D101/20` 混凝土、石料或类似石的材料, or one of `E01D101/22`–`28` |
| `E01D101/3` | `E01D101/30` 金属, or `E01D101/32` / `E01D101/34`                    |
| `E01D101/4` | `E01D101/40` 塑料                                                    |

The old `E01D101/2` and `E01D101/3` titles had several entries merged into
them, so a record filed under one of them may belong in a more specific
subgroup.

**A database seeded from 0.1.2.** Run the three seeds again in the usual
order (`patent_ipc`, `patent_sei`, then `patent_ipc_sei`). This updates changed
rows and adds the new `E01D101` rows. Seeds never delete rows, so remove the
five stale ones yourself:

```sql
DELETE FROM patent_ipc
WHERE code IN ('E01D101/0', 'E01D101/1', 'E01D101/2', 'E01D101/3', 'E01D101/4');
```

`patent_ipc` then holds 79,978 rows. The shipped mapping never referenced these
codes, so `patent_ipc_sei` is unaffected.

**Tables created with your own DDL.** The upsert needs a primary key or unique
constraint on `patent_ipc.code` and `patent_sei.id`. The seeds' own
`CREATE TABLE` statements provide both. If you created the tables yourself
without them, loading a 0.1.3 seed fails with
`there is no unique or exclusion constraint matching the ON CONFLICT specification`.
Add the constraints before loading, for example
`ALTER TABLE patent_ipc ADD PRIMARY KEY (code);`. This itself fails if the
table already contains duplicate codes.

**Pinned counts.** If your own tests assert the entry count (79,972) or the
主组 or 分组 counts, update them.

### Repository

These changes don't affect the published package.

- CI now smoke-tests the built package on Node 18, 20 and 22, and `tsconfig`
  pins `lib` to ES2022 so `tsc` rejects APIs that Node 18 lacks.
- A failed release job can now be re-run to create a missing GitHub release.
- Removed the one-off `import:seed` script. Re-running it would revert the
  0.1.2 title rebuild.

## Earlier versions

See the [GitHub releases](https://github.com/roy-tian/cn-patent-ipc/releases).
