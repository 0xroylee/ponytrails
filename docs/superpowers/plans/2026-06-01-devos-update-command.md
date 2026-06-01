# Devos Update Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `devos update` so users can update the globally installed CLI through the hosted installer path.

**Architecture:** The parser registers a top-level `update` command and dispatches to a small runtime handler. The handler downloads the hosted installer to a temp file with `curl`, runs it with `sh`, streams installer output, and cleans up the temp directory.

**Tech Stack:** Bun, Commander, TypeScript, existing `runCommand` adapter, Bun test.

---

### Task 1: Parser Dispatch

**Files:**
- Create: `packages/cli/src/commands/update.ts`
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/types/args.types.ts`
- Modify: `packages/cli/tests/args-test-helpers.ts`
- Test: `packages/cli/tests/args-update.test.ts`

- [ ] **Step 1: Write the failing parser test**

```typescript
import { describe, expect, it } from "bun:test";
import { captureWithRuntime } from "./args-test-helpers";

describe("createCliProgram update", () => {
	it("runs update command", async () => {
		expect((await captureWithRuntime(["bun", "devos", "update"])).calls).toEqual([
			{
				name: "update",
				payload: { cwd: "/tmp/devos-test" },
			},
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk bun test packages/cli/tests/args-update.test.ts`
Expected: FAIL because `update` is not registered and the test runtime has no update handler.

- [ ] **Step 3: Add parser and runtime contract**

Create `packages/cli/src/commands/update.ts`:

```typescript
import type { Command } from "commander";
import type { CliRuntime } from "../types/args.types";

export function registerUpdateCommand(
	program: Command,
	runtime: CliRuntime,
): void {
	program
		.command("update")
		.description("update the globally installed devos CLI")
		.action(async () => {
			await runtime.handleUpdateCommand({ cwd: runtime.cwd });
		});
}
```

Modify `packages/cli/src/commands/index.ts` to import/register it. Add `UpdateCommand = { cwd: string }` and `handleUpdateCommand(command: UpdateCommand): Promise<void>` to `CliRuntime`. Add the fake runtime method in `packages/cli/tests/args-test-helpers.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk bun test packages/cli/tests/args-update.test.ts`
Expected: PASS.

### Task 2: Update Handler

**Files:**
- Create: `packages/cli/src/features/commands/update-command.ts`
- Modify: `packages/cli/src/features/commands/index.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/tests/update-command.test.ts`

- [ ] **Step 1: Write the failing handler test**

```typescript
import { describe, expect, it, mock } from "bun:test";
import { handleUpdateCommand } from "../src/features/commands";
import type { CommandResult } from "../src/utils/shell";

describe("handleUpdateCommand", () => {
	it("runs the hosted installer through sh", async () => {
		const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
		const runCommand = mock(
			async (
				command: string,
				args: string[],
				options: { cwd: string },
			): Promise<CommandResult> => {
				calls.push({ command, args, cwd: options.cwd });
				return { code: 0, stdout: "", stderr: "" };
			},
		);

		await handleUpdateCommand(
			{ cwd: "/tmp/devos-workspace" },
			{ runCommand, assertCommandOk: assertOk },
		);

		expect(calls).toEqual([
			{
				command: "curl",
				args: ["-fsSL", "https://devos.ing/cli", "-o", calls[0]?.args[3] ?? ""],
				cwd: "/tmp/devos-workspace",
			},
			{
				command: "sh",
				args: [calls[0]?.args[3] ?? ""],
				cwd: "/tmp/devos-workspace",
			},
		]);
	});
});

function assertOk(command: string, args: string[], result: CommandResult): void {
	if (result.code !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed`);
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk bun test packages/cli/tests/update-command.test.ts`
Expected: FAIL because `handleUpdateCommand` is not exported.

- [ ] **Step 3: Add handler**

Create a focused handler that calls `runCommand("curl", ["-fsSL", "https://devos.ing/cli", "-o", scriptPath], { cwd, streamStdout: true, streamStderr: true })`, checks the result, calls `runCommand("sh", [scriptPath], { cwd, streamStdout: true, streamStderr: true })`, checks the result, and removes the temp directory in a `finally` block.

- [ ] **Step 4: Wire handler in the CLI entrypoint**

Import `handleUpdateCommand` in `packages/cli/src/index.ts` and include it in the `CliRuntime` object.

- [ ] **Step 5: Run focused tests and package checks**

Run:
- `rtk bun test packages/cli/tests/args-update.test.ts packages/cli/tests/update-command.test.ts`
- `rtk bun run --filter devos check`
- `rtk bun run --filter devos typecheck`
- `rtk bun run --filter devos test`

Expected: all pass, except unrelated pre-existing worktree changes may affect broader package gates and must be reported separately.
