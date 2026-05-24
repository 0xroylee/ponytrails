import { describe, expect, it } from "bun:test";
import { createHandleRequest } from "../src/app";
import { createRealtimeEventBus } from "../src/realtime";
import type { RealtimeEvent } from "../src/realtime";
import { createWorkflowDataService } from "../src/workflow-data/workflow-data-service";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";
import { seedTaskRouteProject } from "./task-route-test-helpers";

describe("task lifecycle e2e", () => {
	it("updates task lifecycle state through HTTP + workflow service without socket binding", async () => {
		const database = await createDrizzleServerTestDatabase();
		try {
			await seedTaskRouteProject(database.db, "project-1");
			const events: RealtimeEvent[] = [];
			const realtimeEvents = createRealtimeEventBus();
			realtimeEvents.subscribe((event) => events.push(event));
			const handle = createHandleRequest({
				cliExecutor: {
					execute: async (request) => ({ status: "succeeded", request }),
					executeStream: async (request) => ({ status: "succeeded", request }),
					getHistory: () => [],
				},
				db: database.db,
				realtimeEvents,
			});
			const workflowData = createWorkflowDataService(
				database.db,
				realtimeEvents,
			);
			const createdResponse = await handle(
				new Request("http://localhost/api/tasks", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						projectId: "project-1",
						title: "Lifecycle task",
						content: "Exercise the board task lifecycle.",
						priority: 1,
						status: "todo",
						creatorId: "owner-1",
					}),
				}),
			);
			const created = (await createdResponse.json()) as {
				assigneeId: string | null;
				id: string;
				projectId: string;
				status: string;
				taskKey: string;
			};
			expect(created.taskKey).toBe("TASK-000001");
			expect(created.projectId).toBe("project-1");
			expect(created.status).toBe("todo");
			expect(created.assigneeId).toBeNull();
			await workflowData.handle("polling.record", {
				pollerId: "internal-tasks:project-1",
				sourceType: "internal-tasks",
				sourceId: "project-1",
				projectId: "project-1",
				state: "success",
				intervalMs: 5000,
				level: "info",
				eventType: "tick_completed",
				message: "Internal task polling tick completed",
				counts: { readyTaskCount: 1, dispatchCount: 1 },
			});
			const assignedResponse = await handle(
				new Request(`http://localhost/api/tasks/${created.id}`, {
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ assigneeId: "agent-codex-1" }),
				}),
			);
			const assigned = (await assignedResponse.json()) as {
				assigneeId: string;
			};
			expect(assigned.assigneeId).toBe("agent-codex-1");
			const updated = (await workflowData.handle("tasks.update", {
				taskId: created.id,
				values: { status: "implementing" },
			})) as { id: string; status: string };
			expect(updated).toMatchObject({
				id: created.id,
				status: "implementing",
			});
			const finalResponse = await handle(
				new Request(`http://localhost/api/tasks/${created.id}`),
			);
			const finalTask = (await finalResponse.json()) as {
				assigneeId: string;
				status: string;
			};
			expect(finalTask).toMatchObject({
				assigneeId: "agent-codex-1",
				status: "implementing",
			});
			const listResponse = await handle(
				new Request("http://localhost/api/tasks"),
			);
			const taskList = (await listResponse.json()) as Array<{
				assigneeId: string;
				id: string;
				status: string;
			}>;
			expect(taskList).toEqual([
				expect.objectContaining({
					id: created.id,
					assigneeId: "agent-codex-1",
					status: "implementing",
				}),
			]);
			const activityResponse = await handle(
				new Request(`http://localhost/api/tasks/${created.id}/activity`),
			);
			const activity = await activityResponse.json();
			expect(JSON.stringify(activity)).toContain("changed assignee id");
			expect(JSON.stringify(activity)).toContain("changed status");
			const pollingStatusResponse = await handle(
				new Request("http://localhost/api/polling/status"),
			);
			const pollingStatus = (await pollingStatusResponse.json()) as {
				events: Array<{ eventType: string; message: string }>;
				pollers: Array<{ id: string; lastReadyTaskCount: number }>;
			};
			expect(pollingStatus.pollers).toContainEqual(
				expect.objectContaining({
					id: "internal-tasks:project-1",
					lastReadyTaskCount: 1,
				}),
			);
			expect(pollingStatus.events).toContainEqual(
				expect.objectContaining({
					eventType: "tick_completed",
					message: "Internal task polling tick completed",
				}),
			);
			expect(events.map((event) => event.type)).toEqual([
				"issue.created",
				"polling.event",
				"issue.updated",
				"issue.updated",
			]);
		} finally {
			await database.cleanup();
		}
	});
});
