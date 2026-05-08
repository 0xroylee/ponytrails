import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	appendProjectErrorLog,
	applyRunLease,
	clearRunLease,
	hasRunLeaseConflict,
	isRunLeaseExpired,
	normalizeIssueKey,
	projectErrorLogPath,
	transitionStage,
} from "../src/core/state";
import type { RunState } from "../src/core/types";

describe("state helpers", () => {
	it("normalizes issue key from URL", () => {
		const key = normalizeIssueKey(
			"https://linear.app/acme/issue/ENG-321/task-name",
		);
		expect(key).toBe("ENG-321");
	});

	it("transitions stage", () => {
		const now = new Date().toISOString();
		const state: RunState = {
			projectId: "default",
			projectName: "Default",
			workspacePath: "/tmp/work",
			repository: {
				owner: "o",
				name: "n",
				baseBranch: "main",
			},
			issue: { id: "1", key: "ENG-1", title: "t", url: "u" },
			stage: "planning",
			bugs: [],
			startedAt: now,
			updatedAt: now,
		};
		const next = transitionStage(state, "implementing");
		expect(next.stage).toBe("implementing");
	});

	it("applies and clears lease metadata", () => {
		const now = new Date().toISOString();
		const state: RunState = {
			projectId: "default",
			projectName: "Default",
			workspacePath: "/tmp/work",
			repository: {
				owner: "o",
				name: "n",
				baseBranch: "main",
			},
			issue: { id: "1", key: "ENG-1", title: "t", url: "u" },
			stage: "planning",
			bugs: [],
			startedAt: now,
			updatedAt: now,
		};

		const leased = applyRunLease(state, "worker-1", 30000, 1000);
		expect(leased.lease?.ownerId).toBe("worker-1");
		expect(leased.lease?.acquiredAt).toBe("1970-01-01T00:00:01.000Z");
		expect(leased.lease?.expiresAt).toBe("1970-01-01T00:00:31.000Z");

		const cleared = clearRunLease(leased);
		expect(cleared.lease).toBeUndefined();
	});

	it("detects lease expiry and conflicts", () => {
		const now = new Date().toISOString();
		const state: RunState = {
			projectId: "default",
			projectName: "Default",
			workspacePath: "/tmp/work",
			repository: {
				owner: "o",
				name: "n",
				baseBranch: "main",
			},
			issue: { id: "1", key: "ENG-1", title: "t", url: "u" },
			stage: "planning",
			bugs: [],
			lease: {
				ownerId: "worker-a",
				acquiredAt: "1970-01-01T00:00:00.000Z",
				heartbeatAt: "1970-01-01T00:00:05.000Z",
				expiresAt: "1970-01-01T00:00:10.000Z",
			},
			startedAt: now,
			updatedAt: now,
		};

		expect(isRunLeaseExpired(state, 9999)).toBe(false);
		expect(isRunLeaseExpired(state, 10000)).toBe(true);
		expect(hasRunLeaseConflict(state, "worker-b", 9999)).toBe(true);
		expect(hasRunLeaseConflict(state, "worker-a", 9999)).toBe(false);
	});

	it("builds project-scoped error log paths", () => {
		const logPath = projectErrorLogPath("/tmp/workspace", "default");
		expect(logPath).toBe(
			"/tmp/workspace/.piv-loop/projects/default/errors.log",
		);
	});

	it("appends project polling errors as JSON lines", async () => {
		const cwd = await mkdtemp(path.join(os.tmpdir(), "adhd-state-test-"));
		await appendProjectErrorLog(cwd, "default", {
			cycle: 3,
			message: "Linear API failed",
			error: {
				name: "Error",
				message: "boom",
			},
			context: {
				projectName: "Default",
			},
		});

		const content = await readFile(projectErrorLogPath(cwd, "default"), "utf8");
		const entry = JSON.parse(content.trim()) as Record<string, unknown>;
		expect(entry.projectId).toBe("default");
		expect(entry.cycle).toBe(3);
		expect(entry.message).toBe("Linear API failed");
		expect(typeof entry.recordedAt).toBe("string");
		expect(entry.error).toEqual({
			name: "Error",
			message: "boom",
		});
		expect(entry.context).toEqual({
			projectName: "Default",
		});
	});
});
