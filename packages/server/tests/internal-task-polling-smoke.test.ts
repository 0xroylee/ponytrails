import { afterEach, describe, expect, it } from "bun:test";
import type { WorkflowProgressEvent } from "devos/features/server";
import { createHandleRequest } from "../src/app";
import { pollingStatusTable, taskExecutionLogsTable } from "../src/db";
import { startInternalTaskPollingScheduler } from "../src/features/polling";
import type { InternalTaskPollingIntervalHandle } from "../src/features/polling";
import {
	createConfig,
	createLogger,
	parseLogLines,
	succeededResult,
	waitFor,
} from "./internal-task-polling.test-helpers";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";
import { seedTaskRouteProject } from "./task-route-test-helpers";

let testDatabase: DrizzleServerTestDatabase | undefined;

afterEach(async () => {
	if (testDatabase) {
		await testDatabase.cleanup();
		testDatabase = undefined;
	}
});

describe("internal board task smoke flow", () => {
	it("creates an assigned task, polls it, dispatches an agent run, and records done", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const db = testDatabase.db;
		const realtimeEvents: unknown[] = [];
		const app = createHandleRequest({
			cliExecutor: {
				execute: async (request) => succeededResult(request),
				executeStream: async (request) => succeededResult(request),
				getHistory: () => [],
			},
			db,
			realtimeEvents: { publish: (event) => realtimeEvents.push(event) },
		});
		await seedTaskRouteProject(db, "project-1");

		expect(
			await app(
				jsonRequest("/api/agents", {
					id: "agent-smoke",
					name: "Smoke Agent",
					backend: "codex",
					model: "gpt-5",
					createdAt: "2026-05-16T00:00:00.000Z",
				}),
			).then((response) => response.status),
		).toBe(201);

		const created = await expectJson<SmokeTask>(
			app(
				jsonRequest("/api/tasks", {
					projectId: "project-1",
					title: "Smoke task",
					content: "Exercise the internal task polling flow.",
					priority: 1,
					status: "todo",
					creatorId: "owner-1",
					assigneeId: "agent-smoke",
				}),
			),
			201,
		);
		expect(created).toMatchObject({
			assigneeId: "agent-smoke",
			status: "todo",
		});

		let dispatchCount = 0;
		const progressEvent: WorkflowProgressEvent = {
			schema: "devos.workflow.stream.v1",
			emittedAt: "2026-05-16T00:00:00.000Z",
			kind: "stage",
			projectId: "project-1",
			issueKey: created.taskKey,
			stage: "implementing",
			status: "succeeded",
		};
		const scheduler = startInternalTaskPollingScheduler(
			{
				config: createConfig(30000),
				db,
				cliExecutor: {
					execute: async (request) => succeededResult(request),
					executeStream: async (request, emit) => {
						dispatchCount += 1;
						expect(request).toEqual({
							action: "run",
							projectId: "project-1",
							issueKey: created.taskKey,
						});
						emit({ type: "stdout", text: "agent smoke started\n" });
						emit({ type: "progress", event: progressEvent });
						await expectJson<SmokeTask>(
							app(
								jsonRequest(
									`/api/tasks/${created.id}`,
									{ status: "done" },
									"PATCH",
								),
							),
						);
						return succeededResult(request);
					},
					getHistory: () => [],
				},
				logger: createLogger(),
				realtimeEvents: { publish: (event) => realtimeEvents.push(event) },
			},
			{
				setIntervalFn: () => 1 as unknown as InternalTaskPollingIntervalHandle,
				clearIntervalFn: () => {},
			},
		);

		await waitFor(async () => {
			const [status] = await db.select().from(pollingStatusTable);
			return dispatchCount === 1 && status?.state === "success";
		});
		const [pollingStatus] = await db.select().from(pollingStatusTable);
		expect(pollingStatus).toMatchObject({
			lastReadyTaskCount: 1,
			lastDispatchCount: 1,
		});
		const [executionLog] = await db.select().from(taskExecutionLogsTable);
		expect(executionLog?.status).toBe("success");
		expect(
			parseLogLines(executionLog?.log).map((line) => line.event.kind),
		).toEqual(["log", "stage"]);
		const finished = await expectJson<SmokeTask>(
			app(getRequest(`/api/tasks/${created.id}`)),
		);
		expect(finished).toMatchObject({
			assigneeId: "agent-smoke",
			status: "done",
		});
		const activity = await expectJson<unknown[]>(
			app(getRequest(`/api/tasks/${created.id}/activity`)),
		);
		expect(JSON.stringify(activity)).toContain(
			"changed status from `todo` to `done`",
		);
		expect(
			realtimeEvents.map((event) => (event as { type?: string }).type),
		).toEqual(
			expect.arrayContaining([
				"issue.created",
				"issue.updated",
				"task.execution.event",
			]),
		);
		scheduler.stop();
	});
});

interface SmokeTask {
	id: string;
	taskKey: string;
	status: string;
	assigneeId: string | null;
}

function getRequest(pathname: string): Request {
	return new Request(`http://localhost${pathname}`, { method: "GET" });
}

function jsonRequest(
	pathname: string,
	body: unknown,
	method = "POST",
): Request {
	return new Request(`http://localhost${pathname}`, {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

async function expectJson<T>(
	responsePromise: Promise<Response>,
	status = 200,
): Promise<T> {
	const response = await responsePromise;
	expect(response.status).toBe(status);
	return (await response.json()) as T;
}
