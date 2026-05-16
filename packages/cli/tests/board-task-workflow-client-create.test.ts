import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	type ServerDatabase,
	boardProjectsTable,
	boardTasksTable,
	initializeServerDatabase,
	projectBoardsTable,
} from "devos-server/db";
import { eq } from "drizzle-orm";
import { createBoardTaskWorkflowClient } from "../src/features/workflow/board-task-workflow-client";
import { project } from "./smoke-fixtures";

interface TestDatabase {
	database: ServerDatabase;
	root: string;
}

let testDatabase: TestDatabase | undefined;

afterEach(async () => {
	if (!testDatabase) {
		return;
	}
	await testDatabase.database.close();
	await rm(testDatabase.root, { recursive: true, force: true });
	testDatabase = undefined;
});

describe("BoardTaskWorkflowClient task creation", () => {
	it("keeps backlog creation in planning and plan splits in todo", async () => {
		const { config, databasePath } = await setupDatabase();
		const client = createBoardTaskWorkflowClient(config);
		const backlog = await client.createBacklogTask({
			title: "Backlog task",
			description: "Keep in backlog.",
		});
		const todo = await client.createTodoIssueFromPlan(
			{
				id: "parent-1",
				key: "TASK-000001",
				title: "Parent",
				url: "devos://tasks/parent-1",
			},
			{ title: "Planned task", description: "Ready to run." },
		);

		expect((await readTask(databasePath, backlog.id))?.status).toBe("planning");
		expect((await readTask(databasePath, todo.id))?.status).toBe("todo");
		expect((await client.fetchWork()).map((task) => task.identifier)).toEqual([
			todo.identifier,
		]);
	});
});

async function setupDatabase(): Promise<{
	config: ReturnType<typeof project>;
	databasePath: string;
}> {
	const root = await mkdtemp(path.join(os.tmpdir(), "devos-board-client-"));
	const databasePath = path.join(root, "server.pgdata");
	const database = await initializeServerDatabase(databasePath);
	testDatabase = { database, root };
	await database.db.insert(projectBoardsTable).values({
		id: "board-1",
		name: "Board",
		description: null,
		ownerId: "owner-1",
		createdAt: "2026-05-12T00:00:00.000Z",
		updatedAt: "2026-05-12T00:00:00.000Z",
	});
	await database.db.insert(boardProjectsTable).values({
		id: "project-1",
		boardId: "board-1",
		externalProjectId: null,
		name: "Project",
		description: null,
		ownerId: "owner-1",
		createdAt: "2026-05-12T00:00:00.000Z",
		updatedAt: "2026-05-12T00:00:00.000Z",
	});
	const config = project("project-1");
	config.server.database.databasePath = databasePath;
	return { config, databasePath };
}

async function readTask(
	databasePath: string,
	id: string,
): Promise<{ status: string } | undefined> {
	const database = await initializeServerDatabase(databasePath);
	try {
		const [task] = await database.db
			.select({ status: boardTasksTable.status })
			.from(boardTasksTable)
			.where(eq(boardTasksTable.id, id));
		return task;
	} finally {
		await database.close();
	}
}
