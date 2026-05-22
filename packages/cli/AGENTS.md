# devos.ing CLI Agent Instructions

The CLI package owns command parsing, runtime configuration, workflow
orchestration, local run state, task intake, skills management, and integration
boundaries. Keep CLI behavior project-agnostic across configured workspaces.

## Ownership Rules

1. Keep CLI parsing and dispatch in `packages/cli/src/args.ts`,
   `packages/cli/src/index.ts`, and feature command handlers.
2. Put new CLI behavior under `packages/cli/src/features/*`; keep older
   compatibility modules narrow when they exist.
3. Resolve env vars and runtime config through `packages/cli/src/features/config/`;
   keep `index.ts` as the config entrypoint.
4. Keep stage transitions, sequencing, retries, planning, implementation,
   review, polling, queues, worktrees, and run state in
   `packages/cli/src/features/workflow/`.
5. Keep daemon and command-stream behavior in `packages/cli/src/features/daemon/`
   and CLI-facing server helpers in `packages/cli/src/features/server/`.
6. Keep task intake in `packages/cli/src/features/task-intake/` and skills
   catalog/management/prompt behavior in `packages/cli/src/features/skills/`.
7. Keep Linear, GitHub, notifications, and runtime agent adapter integration
   boundaries isolated. Provider execution belongs in `packages/agent-adapters/`;
   CLI adapter modules should remain compatibility or wiring code.
8. Do not construct raw shell command strings in workflow logic; use helper
   modules that pass command arguments as structured arrays.

## Contracts And Tests

1. Keep TypeScript interfaces/type aliases in dedicated `*.types.ts` modules
   when adding or changing contracts.
2. Preserve stable planner and review contracts:
   - `PLANNING_RESULT`, `SUCCESS_GOAL`, and `COMPLEXITY_SCORE`
   - `RESULT: PASS|FAIL`
   - `SUMMARY: ...`
   - `BUGS_JSON: [...]`
3. Add focused tests under `packages/cli/tests/` for new flags, config shapes,
   task intake, skills behavior, state paths, integration wiring, or workflow
   stage transitions.
4. Use Bun for package-level validation:
   - `bun run --filter devos check`
   - `bun run --filter devos typecheck`
   - `bun run --filter devos test`

## Workflow Checkpoints

- Before implementation edits, re-state the scoped plan and confirm the CLI
  modules expected to change.
- After implementation edits and before validation, summarize changed behavior
  and any tests added or updated.
- After checks run, report pass/fail/blocker status, skipped commands, and
  remaining risk.
