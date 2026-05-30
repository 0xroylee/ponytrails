# devos.ing Agent Entry

This repository orchestrates multi-project agent workflows across CLI, server,
database, adapter, landing, and web UI packages. Keep behavior project-agnostic
and avoid coupling workflow logic to a single workspace.

## Harness Operating Loop

Use this loop for every coding-agent session so work starts from repo truth,
stays scoped, and ends with evidence the next session can trust.

1. Start from current state:
   - Confirm the working directory and read this root `AGENTS.md`.
   - Check `git status --short --branch`; identify unrelated dirty files and
     do not modify, stage, revert, or explain them away as part of your work.
   - Before implementation edits, sync `main` according to the Shared
     Must-Follow Rules below. If the sync cannot complete, stop and report the
     blocker instead of building on stale code.
   - Read the closest package-local `AGENTS.md` before changing package code.
   - Consult existing repo records when relevant: `docs/PLANS.md` for active
     execution plans, `docs/QUALITY_SCORE.md` for quality posture, and nearby
     README or domain docs for package-specific behavior.
2. Scope one change:
   - Work on one user request, feature, or fix at a time.
   - Before editing, state the goal, success criteria, and expected files or
     modules to change.
   - Keep supporting fixes narrow and directly tied to the scoped goal; record
     adjacent cleanup or unrelated risk instead of silently expanding scope.
3. Implement with verification in mind:
   - Preserve public contracts, parser markers, package boundaries, and
     project-agnostic workflow behavior unless the request explicitly changes
     them.
   - Add or update focused tests when behavior changes, and choose the smallest
     validation path that proves the scoped change before wider gates.
   - Do not treat code edits as completion; completion requires evidence from
     checks, inspected output, or a clearly documented blocker.
4. Close cleanly:
   - Re-check `git status --short --branch` and confirm the changed files match
     the scoped work plus any pre-existing unrelated changes.
   - Report verification commands run, commands skipped, failures, blockers,
     and residual risk.
   - Leave enough context in the final response for the next session to continue
     without guessing.

## Shared Must-Follow Rules

1. Before executing agent workflow work, pull the latest code from `main` so runs
   start from current repository state. Fetch `origin/main`, update the local
   `main` with a fast-forward-only pull, and do not proceed from stale code.
2. Use Bun for all package management, scripts, workspace filters, and tests.
   Do not add npm, Yarn, or pnpm lockfiles or package-manager-specific config.
3. Do not construct raw shell command strings in workflow logic; use helper
   modules that pass command arguments as structured arrays.
4. Do not add forwarding or barrel export modules for codebase internals.
   Avoid `export * from ...` and pass-through `export { ... } from ...`
   files; import runtime code and types directly from the module that owns the
   behavior or contract.
5. Keep TypeScript files under 250 lines; split files before they grow beyond
   that limit.
6. Keep TypeScript interfaces/type aliases separate from runtime implementation
   when adding or changing contracts, and save all type-related files under a
   `types/` folder.
## Execution Discipline

- State assumptions and tradeoffs before coding when requirements or existing
  patterns are unclear.
- Prefer the simplest change that satisfies the scoped goal; do not add
  speculative configurability, abstractions, or adjacent cleanup.
- Keep edits surgical. Every changed line should trace to the request, and any
  unrelated dead code or risk should be mentioned instead of silently refactored.
- For complex functions, add one short comment that describes the function's
  purpose.
- Define success criteria and verification before or during implementation, then
  loop until the relevant checks pass or a blocker is explicit.

## Workflow Checkpoints

- Before implementation edits, re-state the scoped plan and confirm the files or
  modules expected to change.
- After implementation edits and before validation, summarize the code changes
  made and any tests added or updated.
- After testing or checks, report pass/fail/blocker status, including skipped
  commands and remaining risk.

## Definition Of Done

A change is done only when:

1. The requested behavior or documentation update is complete within the scoped
   files.
2. Relevant package-level or repo-level checks have actually run, or any skipped
   checks are named with the reason.
3. Evidence is summarized in the handoff: commands, inspected output, browser
   verification, or explicit blocker details.
4. Parser contracts, package boundaries, TypeScript file-size/type-placement
   rules, and Bun-only tooling remain intact.
5. The repository is left handoff-ready: no undocumented half-finished work, no
   accidental artifact churn, and unrelated dirty files preserved.

## Package Ownership Map

- `packages/cli/`: CLI parsing, config resolution, workflow orchestration,
  run-state handling, daemon/server helpers, task intake, skills management,
  integrations, and interactions with Codex, Claude, Git, and workflow agents.
- `packages/server/`: API process responsibilities including HTTP routes,
  realtime/ws behavior, cron runtime, workflow-data boundaries, repositories,
  daemon bridge, health/readiness behavior, and server-specific tests.
- `packages/web/`: Next.js operator UI, client-side data access, providers,
  realtime state, components, styles, and frontend verification.
- `packages/db/`: Shared database schema, migrations, database helpers, scripts,
  and db package tests.
- `packages/landing/`: Public landing site pages, marketing components, and
  landing-specific styles.
- `packages/agent-adapters/`: Runtime adapters for external coding agents,
  provider registries, command argument construction, and normalized agent
  output contracts.

Package-local `AGENTS.md` files add instructions for each workspace. Follow the
root rules everywhere, then follow the closest package-specific file for the
code you are changing.

## Quality Gates

Run all checks before finalizing changes:

1. `bun run check`
2. `bun run typecheck`
3. `bun test`

## Documentation Map

- Architecture details:
  [ARCHITECTURE.md](ARCHITECTURE.md)
- Execution and operating plans:
  [docs/PLANS.md](docs/PLANS.md)
- Reliability and run behavior:
  [docs/RELIABILITY.md](docs/RELIABILITY.md)
- Security and secrets handling:
  [docs/SECURITY.md](docs/SECURITY.md)
- Quality posture:
  [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md)
