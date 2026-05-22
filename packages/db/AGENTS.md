# devos.ing Database Package Instructions

The database package owns shared schema, migrations, database helpers, and
database scripts used by server and workflow code. Keep database contracts
explicit and avoid leaking server or CLI policy into this package.

## Ownership Rules

1. Keep schema definitions under `packages/db/src/schema/`.
2. Keep migrations under `packages/db/src/migrations/` and add new migrations
   as ordered, append-only files.
3. Keep database initialization and helpers in `packages/db/src/` with contracts
   in dedicated `*.types.ts` modules.
4. Keep scripts for migrate, seed, and backup under `packages/db/scripts/`.
5. Do not import server routes, CLI workflow orchestration, Linear, GitHub, or
   UI code into this package.
6. Keep database operations deterministic and safe to rerun where scripts or
   tests may execute repeatedly.

## Tests And Checks

1. Add or update tests under `packages/db/tests/` for schema, migrations,
   scripts, and database helper behavior.
2. Run package-level checks when database behavior changes:
   - `bun run --filter devos-db check`
   - `bun run --filter devos-db typecheck`
   - `bun run --filter devos-db test`
3. For cross-workspace impact, run the repository quality gates from the root
   `AGENTS.md`.
