# Agent Adapters Package Instructions

This package owns runtime adapters that execute external coding agents for
devos.ing workflow stages. Keep provider execution here and keep workflow,
Linear, GitHub, database, and run-state policy in the CLI or server packages.

## Rules

1. Keep adapter contracts in dedicated `*.types.ts` modules.
2. Keep provider code free of workflow, Linear, GitHub, database, and run-state
   logic.
3. Build runtime invocations as structured `{ command, args, cwd, env }` style
   data; do not assemble raw shell command strings.
4. Normalize provider output into `AgentResult`, including `finalMessage`,
   `stdout`, optional `sessionId`, and optional usage.
5. Add focused tests for provider parsing, command argument construction,
   session IDs, usage mapping, and error behavior.
6. Keep provider-specific files grouped by folder, such as `src/codex/*` and
   `src/claude/*`.
7. Keep provider folders consistent: `adapter.ts`, `constants.ts`,
   `configuration-doc.ts`, and `index.ts`.
8. Keep shared backend/model metadata in `src/registry.ts` and
   `src/agent-registry.types.ts`.
9. Export shared provider surfaces through `package.json` subpaths only when
   callers need a stable boundary.
10. Keep TypeScript files under 250 lines.
