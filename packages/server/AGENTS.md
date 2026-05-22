# devos.ing Server Agent Instructions

The server package owns the HTTP/API process, realtime events, cron runtime,
workflow-data boundary, repositories, and daemon bridge for operator-facing
services. Keep server code focused on server process concerns and explicit
boundaries to CLI, database, and shared adapter behavior.

## Ownership Rules

1. Keep server runtime code under `packages/server/src/`.
2. Keep HTTP request handling, validation, and response mapping in `src/http/`
   or route-specific modules with small handlers.
3. Keep realtime and websocket concerns in `src/realtime/` and `src/ws/`.
4. Keep cron scheduling/runtime behavior in `src/features/cron/` and legacy
   cron exports narrow.
5. Keep workflow-data behavior in `src/workflow-data/` and repository/data
   access boundaries explicit.
6. Treat database initialization, middleware, logging, startup paths, and
   health/readiness behavior as infrastructure concerns with deterministic tests.
7. Keep server contracts in dedicated `*.types.ts` modules separate from runtime
   implementation.
8. Use stable error categories and status mapping so route failures produce
   predictable response shapes for callers and tests.
9. Do not duplicate CLI workflow, config, or integration business logic in the
   server package.
10. Call CLI-facing or shared APIs only through explicit boundaries. If a new
   boundary is needed, define the contract first, then keep the runtime adapter
   narrow.
11. Keep middleware and logs security-minded: include request/failure context
   without exposing secrets, credentials, tokens, or private user content.
12. Keep health and readiness behavior simple, deterministic, and covered by
   tests.

## Tests

1. Add or update tests under `packages/server/tests/` for new routes, response
   shapes, boundary validation, realtime/ws behavior, cron behavior,
   health/readiness behavior, server config, and error handling/status mapping.
2. Run package-level checks when server behavior changes:
   - `bun run --filter devos-server check`
   - `bun run --filter devos-server typecheck`
   - `bun run --filter devos-server test`
3. For cross-workspace impact or release readiness, run repository quality
   gates with Bun:
   - `bun run check`
   - `bun run typecheck`
   - `bun test`

## Workflow Checkpoints

- Before implementation edits, re-state the scoped plan and confirm the server
  modules expected to change.
- After implementation edits and before validation, summarize changed behavior
  and any tests added or updated.
- After checks run, report pass/fail/blocker status, skipped commands, and
  remaining risk.
