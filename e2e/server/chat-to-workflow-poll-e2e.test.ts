import { afterEach, describe, expect, it } from "bun:test";
import { WebSocket } from "ws";
import { loadRunState } from "../../packages/cli/src/features/workflow/state";
import { runWorkflow } from "../../packages/cli/src/features/workflow/workflow";
import { createServerTestApp } from "../../packages/server/tests/app-test-helpers";
import {
	type ChatWorkflowPollTestSetup,
	cleanupChatWorkflowPollTest,
	createLoadedConfig,
	createWorkflowRuntime,
	requestJson,
	setupChatWorkflowPollTest,
	taskIntakeOutput,
} from "./chat-to-workflow-poll-e2e-harness";
import { canOpenLoopbackServer } from "./websocket-flow-e2e-harness";

let activeTest: ChatWorkflowPollTestSetup | undefined;

afterEach(async () => {
	const test = activeTest;
	activeTest = undefined;
	if (test) {
		await cleanupChatWorkflowPollTest(test);
	}
});

describe("chat to workflow poll e2e", () => {
	it("creates a plan task from chat clarification and lets CLI polling pick it up", async () => {
		if (!(await canOpenLoopbackServer())) {
			return;
		}
		const setup = await setupChatWorkflowPollTest(
			WebSocket as unknown as typeof globalThis.WebSocket,
		);
		activeTest = setup;
		const cliCalls: unknown[] = [];
		let intakeCalls = 0;
		const app = createServerTestApp(setup.database.db, {
			cliExecutor: {
				execute: async (request) => {
					cliCalls.push(request);
					intakeCalls += 1;
					return {
						status: "succeeded",
						request,
						commandResult: {
							code: 0,
							stdout: taskIntakeOutput(intakeCalls),
							stderr: "",
						},
					};
				},
				executeStream: async (request) => ({ status: "succeeded", request }),
				getHistory: () => [],
			},
			realtimeEvents: setup.realtimeEvents,
			workspacePath: setup.workspacePath,
		});
		const created = await requestJson<{ id: string; taskId: string }>(
			app,
			"POST",
			"/api/chat/sessions",
			{},
		);

		await requestJson<unknown>(
			app,
			"POST",
			`/api/chat/sessions/${created.id}/send`,
			{
				content: "Submit ur idea for an agent handoff",
			},
		);
		await waitForEvent(setup.events, "chat.session.updated");
		const unclear = await readChatState(app, created.id);

		expect(findIssueEvent(setup.events)).toMatchObject({
			id: created.taskId,
			status: "backlog",
			title: "Untitled chat",
		});
		expect(unclear.messages[1]).toMatchObject({ kind: "clarification" });
		expect(unclear.messages[1]?.content).toContain(
			"Which agent should own it?",
		);
		expect(unclear.session.pendingRequest).toBe(
			"Submit ur idea for an agent handoff",
		);

		setup.events.length = 0;
		await requestJson<unknown>(
			app,
			"POST",
			`/api/chat/sessions/${created.id}/send`,
			{
				content: "codex",
				answers: [{ question: "Which agent should own it?", answer: "codex" }],
			},
		);
		await waitForEvent(setup.events, "chat.session.updated");
		const answered = await readChatState(app, created.id);

		expect(findIssueEvent(setup.events)).toMatchObject({
			id: created.taskId,
			content: "Create an agent handoff from chat.",
			status: "plan",
		});
		expect(answered.session.pendingRequest).toBeNull();

		await runWorkflow(
			createLoadedConfig(setup.workspacePath, setup.database.path),
			{ poll: true, maxPollCycles: 1 },
			createWorkflowRuntime(),
		);

		const finalTask = await requestJson<{ status: string; taskKey: string }>(
			app,
			"GET",
			`/api/tasks/${created.taskId}`,
		);
		expect(finalTask.status).toBe("in_review");
		const runState = await loadRunState(
			setup.workspacePath,
			"default",
			finalTask.taskKey,
		);
		expect(runState).toMatchObject({
			implementationSummary: "Implemented chat handoff.",
			planSummary: expect.stringContaining("PLANNING_RESULT: READY"),
			stage: "done",
			testingSummary: "clean",
		});
		const sessionStatus = await requestJson<{
			status: string;
			taskStatus: string | null;
			workflowState: string | null;
		}>(app, "GET", `/api/chat/sessions/${created.id}/status`);
		expect(sessionStatus).toMatchObject({
			status: "idle",
			taskStatus: finalTask.status,
			workflowState: "done",
		});
		await expectTaskActivity(app, created.taskId);
		await expectPollingStatus(app);
		expect(setup.events.map((event) => event.type)).toContain("polling.event");
		expect(cliCalls).toMatchObject([
			{ request: "Submit ur idea for an agent handoff" },
			{
				request: "Submit ur idea for an agent handoff",
				clarificationAnswers: [
					{ question: "Which agent should own it?", answer: "codex" },
				],
			},
		]);
	});
});

interface ChatRouteState {
	messages: Array<{ content: string; kind: string }>;
	session: { pendingRequest: string | null };
}

async function readChatState(
	app: (request: Request) => Response | Promise<Response>,
	sessionId: string,
): Promise<ChatRouteState> {
	const messages = await requestJson<ChatRouteState["messages"]>(
		app,
		"GET",
		`/api/chat/sessions/${sessionId}/messages`,
	);
	const sessions = await requestJson<ChatRouteState["session"][]>(
		app,
		"GET",
		"/api/chat/sessions?workspaceId=owner-1",
	);
	const session = sessions.find((item) => item.pendingRequest !== undefined);
	if (!session) {
		throw new Error("Missing chat session state");
	}
	return { messages, session };
}

async function waitForEvent(
	events: Array<{ type: string }>,
	type: string,
): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		if (events.some((event) => event.type === type)) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error(`Timed out waiting for ${type}`);
}

function findIssueEvent(
	events: Array<{ type: string }>,
): Record<string, unknown> | undefined {
	const event = events.find(
		(candidate) => candidate.type === "issue.updated",
	) as { issue?: Record<string, unknown> } | undefined;
	return event?.issue;
}

async function expectTaskActivity(
	app: (request: Request) => Response | Promise<Response>,
	taskId: string,
): Promise<void> {
	const activity = await requestJson<unknown>(
		app,
		"GET",
		`/api/tasks/${taskId}/activity`,
	);
	const activityText = JSON.stringify(activity);
	expect(activityText).toContain("Planning completed; implementation started.");
	expect(activityText).toContain("Implementation completed");
	expect(activityText).toContain("Review/testing passed");
}

async function expectPollingStatus(
	app: (request: Request) => Response | Promise<Response>,
): Promise<void> {
	const pollingStatus = await requestJson<{
		events: Array<{ eventType: string }>;
		pollers: Array<{
			id: string;
			lastIssueCount: number;
			sourceType: string;
		}>;
	}>(app, "GET", "/api/polling/status");
	expect(pollingStatus.pollers).toContainEqual(
		expect.objectContaining({
			id: "tasks:default",
			lastIssueCount: 1,
			sourceType: "tasks",
		}),
	);
	expect(pollingStatus.events.map((event) => event.eventType)).toContain(
		"cycle_completed",
	);
}
