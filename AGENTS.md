# AGENTS.md

Guidance for AI coding agents working in this repository.

## Commands

- Use Node 24, as CI does. Tests and `scripts/*.ts` run through Node's native
  type stripping, with no tsx or ts-node.
- Full gate, same as CI:
  `npm run format:check && npm run check && npm test && npm run build && npm run smoke`
- Single test: `node --test --test-name-pattern="ancestors" tests/api.test.ts`
- Run `npm run format` after editing Markdown. Prettier covers the docs and
  skips `data/`, `sql/` and `dist/`.

## Code constraints

- The published package supports Node ≥ 18 (`engines`, tsup `target: node18`).
  `lib` is ES2022, so `tsc` rejects newer JS APIs such as `toSorted()`. Nothing
  but the CI smoke test on Node 18/20/22 checks Node APIs such as
  `import.meta.dirname`, so keep `src/` within Node 18. `scripts/smoke.mjs`
  stays plain JS for the same reason.
- `erasableSyntaxOnly`: no `enum`, `namespace` or parameter properties.
- Relative imports keep the `.ts` extension, and type-only imports use
  `import type`.
- Write code comments and JSDoc in Chinese.
- Zero runtime dependencies. Never add anything to `dependencies`.

## Architecture gotchas

- `src/index.ts` and `src/sei.ts` are separate entrypoints that share the JSONL
  cache and the code → entry index in `src/internal/`. Don't build a second
  index in an entrypoint.
- The CJS build keeps that sharing only through `splitting: true`. Without it
  each `.cjs` entrypoint bundles its own copy and parses the data twice. The
  smoke test catches this.
- `exports` points `require` at `.d.cts` and `import` at `.d.ts`. A single
  `.d.ts` breaks TypeScript CJS users on `module: node16` (TS1471).
  `typesVersions` only serves `node10` resolution of `./sei`.
- `src/internal/load.ts` finds `data/` by walking up from the module directory
  and prefers `__dirname` (CJS) over `import.meta.url` (ESM).
  `tsup.config.ts` defines `import.meta.url` as `undefined` for CJS. Keep both.
- Loaded data is a cached, deep-frozen singleton typed `readonly`. Never mutate
  it.
- The SQL seeds upsert with `ON CONFLICT` so they can be re-run. They have no
  `BEGIN`/`COMMIT` on purpose, because migration tools wrap scripts in their
  own transaction. The upsert makes a fresh load about twice as slow.

## Changing data

- `data/*.jsonl` is the source of truth: sorted by code, with unique codes.
  Edit it directly and check changes against the official CNIPA PDF for the
  edition. There is no importer or title-rebuild script. Don't add a seed
  importer back, because re-running one reverts the PDF title rebuild.
- The quirks listed in `NOTICE.md` (empty titles, no `H01L`, `null` versions
  and subgroup levels) are intentional. Don't "fix" them.
- One data change touches all of these:
  1. `data/*.jsonl`, then `npm run generate:sql`. Never edit `sql/` by hand: a
     test requires it to match `scripts/render-sql.ts` output byte for byte.
  2. Pinned counts in `tests/data.test.ts` and `tests/api.test.ts`
  3. `DATA_VERSION` in `src/types.ts`, if a newer edition appears
  4. Counts in `README.md`, `README_en.md` and the `package.json`
     `description`, and notes in `NOTICE.md` and `NOTICE_en.md`
  5. `version` in `package.json`, plus a `CHANGELOG.md` entry
- Data tests loop over ~80k rows. Build a `Set` or `Map` first, because a
  nested `.some()` or `.find()` inside the loop pushes CI to minutes.

## Docs

- `README.md` and `NOTICE.md` are Chinese, and `README_en.md` and
  `NOTICE_en.md` are their English counterparts. Keep each pair in sync.
- `CHANGELOG.md` is English. Give every release upgrade steps for anything
  users must act on.

## Git and release

- Work on `develop`. `master` is fast-forwarded from `develop`, with linear
  history and no merge commits.
- Commit messages follow Conventional Commits in English, for example
  `fix(data): …` or `ci(release): …`.
- To release, bump `version`, add the `CHANGELOG.md` entry, fast-forward
  `master` and push tag `vX.Y.Z` from it. `release.yml` tests, smoke-tests,
  publishes to npm through OIDC trusted publishing (no `NPM_TOKEN`) and creates
  the GitHub release.
- `release.yml` skips everything when the tag doesn't match `version`, and
  skips only the publish when that version is already on npm, so a failed
  release job can be re-run.
