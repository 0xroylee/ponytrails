import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { loadRunState } from "../../packages/cli/src/features/workflow/state";
import { createServerTestApp } from "../../packages/server/tests/app-test-helpers";
import { seedTaskRouteProject } from "../../packages/server/tests/task-route-test-helpers";
import {
	type ChatWorkflowPollTestSetup,
	cleanupChatWorkflowPollTest,
	requestJson,
	setupChatWorkflowPollTest,
} from "../server/chat-to-workflow-poll-e2e-harness";

interface ActiveTest {
	setup: ChatWorkflowPollTestSetup;
	tempRoot: string;
}

let activeTest: ActiveTest | undefined;

afterEach(async () => {
	const test = activeTest;
	activeTest = undefined;
	if (!test) {
		return;
	}
	await cleanupChatWorkflowPollTest(test.setup);
	await rm(test.tempRoot, { recursive: true, force: true });
});

describe("CLI process workflow e2e", () => {
	it("runs a task through the real CLI process with fake Codex", async () => {
		const setup = await setupChatWorkflowPollTest(
			WebSocket as unknown as typeof globalThis.WebSocket,
		);
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "devos-cli-e2e-"));
		const executionPath = path.join(tempRoot, "repo");
		const originPath = path.join(tempRoot, "origin.git");
		activeTest = { setup, tempRoot };
		await mkdir(executionPath);
		await setupGitRepository(executionPath, originPath);
		await seedTaskRouteProject(setup.database.db, "default");
		const app = createServerTestApp(setup.database.db, {
			realtimeEvents: setup.realtimeEvents,
			workspacePath: setup.workspacePath,
		});
		const created = await requestJson<{ id: string; taskKey: string }>(
			app,
			"POST",
			"/api/tasks",
			{
				projectId: "default",
				title: "CLI e2e workflow",
				content: "Exercise the workflow through the CLI process.",
				priority: 1,
				status: "plan",
				creatorId: "owner-1",
			},
		);

		const result = await runCliWorkflowProcess({
			issueKey: created.taskKey,
			executionPath,
			workspacePath: setup.workspacePath,
		});

		expect(result.exitCode).toBe(0);
		const runState = await loadRunState(
			setup.workspacePath,
			"default",
			created.taskKey,
		);
		const finalTask = await requestJson<{ status: string }>(
			app,
			"GET",
			`/api/tasks/${created.id}`,
		);
		if (finalTask.status !== "in_review") {
			throw new Error(JSON.stringify({ finalTask, result, runState }, null, 2));
		}
		expect(finalTask.status).toBe("in_review");
		expect(runState).toMatchObject({
			implementationSummary: "Implemented by fake Codex.",
			stage: "done",
			testingSummary: "clean",
		});
		expect(runState?.planSummary).toContain("PLANNING_RESULT: READY");
		expect(runState?.pullRequest?.url).toBe("https://example.invalid/dry-run");
		expect(setup.events.map((event) => event.type)).toContain("polling.event");
	});
});

async function runCliWorkflowProcess(input: {
	executionPath: string;
	issueKey: string;
	workspacePath: string;
}): Promise<{ exitCode: number | null; stderr: string; stdout: string }> {
	const proc = Bun.spawn({
		cmd: [
			"bun",
			path.join(import.meta.dir, "../../packages/cli/src/index.ts"),
			"run",
			"--project",
			"default",
			"--issue",
			input.issueKey,
			"--max-poll-cycles",
			"1",
			"--poll-interval-ms",
			"1",
		],
		cwd: path.join(import.meta.dir, "../.."),
		env: {
			...process.env,
			CODEX_BINARY: path.join(import.meta.dir, "fake-codex.ts"),
			DEVOS_WORKFLOW_WS_URL: process.env.DEVOS_WORKFLOW_WS_URL ?? "",
			GITHUB_BASE_BRANCH: "main",
			GITHUB_REPO_NAME: "repo",
			GITHUB_REPO_OWNER: "acme",
			PIV_DRY_RUN: "1",
			PIV_EXECUTION_PATH: input.executionPath,
			PIV_MAX_POLL_CYCLES: "1",
			PIV_POLL_INTERVAL_MS: "1",
			PIV_WORKSPACE_PATH: input.workspacePath,
		},
		stderr: "pipe",
		stdout: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stderr, stdout };
}

async function setupGitRepository(
	executionPath: string,
	originPath: string,
): Promise<void> {
	await runGit(["init", "-b", "main"], executionPath);
	await runGit(["config", "user.email", "e2e@example.invalid"], executionPath);
	await runGit(["config", "user.name", "E2E"], executionPath);
	await writeFile(path.join(executionPath, "README.md"), "CLI E2E\n", "utf8");
	await runGit(["add", "README.md"], executionPath);
	await runGit(["commit", "-m", "Initial commit"], executionPath);
	await runGit(["init", "--bare", originPath], executionPath);
	await runGit(["remote", "add", "origin", originPath], executionPath);
	await runGit(["push", "-u", "origin", "main"], executionPath);
}

async function runGit(args: string[], cwd: string): Promise<void> {
	const proc = Bun.spawn({
		cmd: ["git", ...args],
		cwd,
		stderr: "pipe",
		stdout: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode !== 0) {
		throw new Error(
			`git ${args.join(" ")} failed\nstdout:\n${stdout}\nstderr:\n${stderr}`,
		);
	}
}
