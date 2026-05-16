import type { LoadedConfig } from "devos/features/config";
import type {
	CliCommandExecutionResult,
	WorkflowProgressEvent,
} from "devos/features/server";
import {
	type ServerDatabase,
	boardProjectsTable,
	boardTasksTable,
	projectBoardsTable,
} from "../src/db";
import type { ServerLogger } from "../src/logger.types";

const CREATED_AT = "2026-05-13T00:00:00.000Z";

export async function seedProjectTask(
	db: ServerDatabase["db"],
	status: string,
): Promise<void> {
	await db.insert(projectBoardsTable).values({
		id: "board-1",
		name: "Board",
		description: null,
		ownerId: "owner-1",
		createdAt: CREATED_AT,
		updatedAt: CREATED_AT,
	});
	await db.insert(boardProjectsTable).values({
		id: "project-1",
		boardId: "board-1",
		externalProjectId: null,
		name: "Project",
		description: null,
		ownerId: "owner-1",
		createdAt: CREATED_AT,
		updatedAt: CREATED_AT,
	});
	await db.insert(boardTasksTable).values({
		id: "task-1",
		taskKey: "TASK-000001",
		projectId: "project-1",
		title: "Polling task",
		content: "Run me",
		priority: 1,
		status,
		dueDate: null,
		creatorId: "owner-1",
		linkedPr: null,
		linearIssueId: null,
		linearIdentifier: null,
		linearUrl: null,
		createdAt: CREATED_AT,
		updatedAt: CREATED_AT,
	});
}

export function createConfig(intervalMs: number): LoadedConfig {
	return {
		projects: [],
		polling: {
			intervalMs,
			maxCycles: undefined,
			exitWhenIdle: true,
			staleRunTimeoutMs: 3600000,
		},
		notifications: { email: { enabled: false, to: [] } },
	};
}

export function succeededResult(request: unknown): CliCommandExecutionResult {
	return { status: "succeeded", request: request as { action: string } };
}

export function rejectedResult(request: unknown): CliCommandExecutionResult {
	return {
		status: "rejected",
		request: request as { action: string },
		error: "bad request",
	};
}

export function parseLogLines(log: string | undefined): Array<{
	event: WorkflowProgressEvent;
}> {
	return (log ?? "")
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as { event: WorkflowProgressEvent });
}

export async function waitFor(
	check: () => boolean | Promise<boolean>,
): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		if (await check()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error("Timed out waiting for condition");
}

export function createLogger(): ServerLogger {
	return { info: () => {}, error: () => {}, fatal: () => {} };
}
