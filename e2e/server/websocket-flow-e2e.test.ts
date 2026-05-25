import { afterEach, describe, expect, it } from "bun:test";
import { WebSocket } from "ws";
import { WORKFLOW_DATA_WS_PATH } from "../../packages/server/src/workflow-data";
import { createApiClient } from "../../packages/web/src/lib/api/client";
import { subscribeToRealtimeEvents } from "../../packages/web/src/lib/realtime/realtime-client";
import {
	REALTIME_WS_PATH,
	type TestHarness,
	WebSocketImpl,
	canOpenLoopbackServer,
	connectCliWorker,
	setupHarness,
} from "./websocket-flow-e2e-harness";

let activeHarness: TestHarness | undefined;

afterEach(async () => {
	await activeHarness?.close();
	activeHarness = undefined;
});

describe("websocket flow e2e", () => {
	it("streams a web command through the server broker to the CLI worker and back", async () => {
		if (!(await canOpenLoopbackServer())) {
			return;
		}
		const harness = await setupHarness();
		activeHarness = harness;
		const worker = await connectCliWorker(harness);
		const webClient = createApiClient({
			WebSocketImpl,
			wsUrl: harness.url(WORKFLOW_DATA_WS_PATH),
		});
		const events: unknown[] = [];

		await webClient.streamCliCommand({ action: "onboard" }, (event) => {
			events.push(event);
		});

		expect(events).toEqual([
			{
				type: "start",
				request: { action: "onboard" },
				invocation: {
					command: "bun",
					args: ["run", "packages/cli/src/index.ts", "onboard"],
				},
			},
			{ type: "stdout", text: "hello from cli\n" },
			{
				type: "progress",
				event: {
					schema: "devos.workflow.stream.v1",
					emittedAt: "2026-05-23T00:00:00.000Z",
					kind: "action",
					action: "onboard",
					status: "succeeded",
				},
			},
			{
				type: "complete",
				result: {
					status: "succeeded",
					request: { action: "onboard" },
					invocation: {
						command: "bun",
						args: ["run", "packages/cli/src/index.ts", "onboard"],
					},
					commandResult: {
						code: 0,
						stdout: "hello from cli\n",
						stderr: "",
					},
				},
			},
		]);
		expect(harness.broker.getHistory()).toEqual([
			expect.objectContaining({
				request: { action: "onboard" },
				status: "succeeded",
				command: "bun",
				args: ["run", "packages/cli/src/index.ts", "onboard"],
				exitCode: 0,
				stdout: "hello from cli\n",
			}),
		]);
		expect(worker.readyState).toBe(WebSocket.OPEN);
	});

	it("delivers realtime events to web subscribers", async () => {
		if (!(await canOpenLoopbackServer())) {
			return;
		}
		const harness = await setupHarness();
		activeHarness = harness;
		const receivedEvent = new Promise<unknown>((resolve, reject) => {
			const subscription = subscribeToRealtimeEvents({
				url: harness.url(REALTIME_WS_PATH),
				WebSocketImpl,
				onEvent: resolve,
				onError: reject,
				onStatus: (status) => {
					if (status === "connected") {
						harness.realtimeEvents.publish({
							type: "polling.event",
							polling: {
								pollerId: "internal-tasks:project-1",
								eventType: "cycle_completed",
								level: "info",
								message: "polling tick completed",
							},
						});
					}
				},
			});
			activeHarness = {
				...harness,
				close: async () => {
					subscription.close();
					await harness.close();
				},
			};
		});

		await expect(receivedEvent).resolves.toEqual({
			id: "event-1",
			emittedAt: "2026-05-23T00:00:00.000Z",
			type: "polling.event",
			polling: {
				pollerId: "internal-tasks:project-1",
				eventType: "cycle_completed",
				level: "info",
				message: "polling tick completed",
			},
		});
	});
});
