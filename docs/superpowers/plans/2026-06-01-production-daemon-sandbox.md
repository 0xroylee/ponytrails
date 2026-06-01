# Production Daemon Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add `bun run sandbox:daemon` to run the built local production daemon in isolated sandbox state.

**Architecture:** Implement a testable root script that owns argument parsing, sandbox path/env construction, instance config writing, optional build execution, and daemon spawning. Keep mutable state under `.devos/sandboxes/production-daemon/` and launch `packages/cli/dist/index.js daemon` with isolated `HOME`, `CODEX_HOME`, workspace, database, and non-default ports.

**Tech Stack:** Bun, TypeScript, Node `fs/promises`, Node `child_process`, existing Bun test suite.

---

### File Structure

- Create: `scripts/prod-daemon-sandbox.ts`
  - Owns sandbox option parsing, environment construction, instance config rendering, and command orchestration.
- Create: `packages/cli/tests/prod-daemon-sandbox-script.test.ts`
  - Tests the exported helpers and fake command runner behavior.
- Modify: `package.json`
  - Adds `sandbox:daemon`.

### Task 1: Sandbox Script Unit Tests

**Files:**
- Create: `packages/cli/tests/prod-daemon-sandbox-script.test.ts`

- [x] **Step 1: Write failing tests**

Create tests that import `buildProdDaemonSandbox`, `parseProdDaemonSandboxArgs`, and `runProdDaemonSandbox` from `../../../scripts/prod-daemon-sandbox`.

Cover:

- default paths and env values for cwd `/repo`
- custom ports and `--skip-build`
- port conflict failure
- fake runner command order: build first, daemon second

- [x] **Step 2: Run test to verify it fails**

Run: `rtk bun test packages/cli/tests/prod-daemon-sandbox-script.test.ts`

Expected: FAIL because `scripts/prod-daemon-sandbox.ts` does not exist.

### Task 2: Sandbox Script Implementation

**Files:**
- Create: `scripts/prod-daemon-sandbox.ts`

- [x] **Step 1: Implement exported helpers**

Add:

- `parseProdDaemonSandboxArgs(args: string[]): ProdDaemonSandboxOptions`
- `buildProdDaemonSandbox(options: ProdDaemonSandboxOptions): ProdDaemonSandbox`
- `runProdDaemonSandbox(options?: RunProdDaemonSandboxOptions): Promise<number>`

The sandbox should default to server port `3101`, web port `3100`, and database
port `55429`.

- [x] **Step 2: Write instance config**

Render a valid `instance.config.json` under
`.devos/sandboxes/production-daemon/home/.devos/config/instance.config.json`
with sandboxed storage, database, logging, and secrets paths.

- [x] **Step 3: Spawn commands**

Run `bun run build` unless `--skip-build` is present, then spawn
`bun packages/cli/dist/index.js daemon` with inherited stdio and sandbox env.

- [x] **Step 4: Run test to verify it passes**

Run: `rtk bun test packages/cli/tests/prod-daemon-sandbox-script.test.ts`

Expected: PASS.

### Task 3: Package Script

**Files:**
- Modify: `package.json`

- [x] **Step 1: Add script**

Add:

```json
"sandbox:daemon": "bun run ./scripts/prod-daemon-sandbox.ts"
```

- [x] **Step 2: Run focused check**

Run: `rtk bun run --filter devos check`

Expected: PASS.

### Task 4: Validation

**Files:**
- No new files.

- [x] **Step 1: Run focused tests**

Run: `rtk bun test packages/cli/tests/prod-daemon-sandbox-script.test.ts`

Expected: PASS.

- [x] **Step 2: Run package checks**

Run:

```bash
rtk bun run --filter devos check
rtk bun run --filter devos typecheck
```

Expected: PASS.

- [x] **Step 3: Run root quality gate if feasible**

Run:

```bash
rtk bun run check
rtk bun run typecheck
rtk bun test
```

Expected: PASS, or report unrelated/pre-existing blockers separately.
