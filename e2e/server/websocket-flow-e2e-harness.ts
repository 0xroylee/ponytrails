import { type Server, createServer } from "node:http";
import { WebSocket } from "ws";
import { handleWorkerMessage } from "../../packages/cli/src/features/daemon";
import type { CliCommandExecutionResult } from "../../packages/cli/src/features/server";
import { createRealtimeEventBus } from "../../packages/server/src/realtime";
import { WORKFLOW_DATA_WS_PATH } from "../../packages/server/src/workflow-data";
import { createWorkflowCommandBroker } from "../../packages/server/src/workflow-data/workflow-command-broker";
import { attachWorkflowDataSocket } from "../../packages/server/src/workflow-data/workflow-data-socket";
import { attachRealtimeEventsSocket } from "../../packages/server/src/ws/realtime-events";

export const REALTIME_WS_PATH = "/api/events";
export const WebSocketImpl =
	WebSocket as unknown as typeof globalThis.WebSocket;

export interface TestHarness {
	broker: ReturnType<typeof createWorkflowCommandBroker>;
	close(): Promise<void>;
	httpServer: Server;
	realtimeEvents: ReturnType<typeof createRealtimeEventBus>;
	realtimeProxy: { close(): Promise<void> };
	url(path: string): string;
	workerSocket?: WebSocket;
	workflowProxy: { close(): Promise<void> };
}

export async function setupHarness(): Promise<TestHarness> {
	const httpServer = createServer((_request, response) => {
		response.statusCode = 404;
		response.end();
	});
	const broker = createWorkflowCommandBroker();
	const realtimeEvents = createRealtimeEventBus(
		() => "2026-05-23T00:00:00.000Z",
		() => "event-1",
	);
	const workflowProxy = attachWorkflowDataSocket({
		server: httpServer,
		path: WORKFLOW_DATA_WS_PATH,
		db: {} as never,
		commandBroker: broker,
		realtimeEvents,
	});
	const realtimeProxy = attachRealtimeEventsSocket({
		server: httpServer,
		path: REALTIME_WS_PATH,
		eventBus: realtimeEvents,
	});
	const port = await listenOnPortZero(httpServer);
	const baseUrl = `ws://127.0.0.1:${port}`;
	const harness: TestHarness = {
		broker,
		httpServer,
		realtimeEvents,
		realtimeProxy,
		workflowProxy,
		url: (path) => `${baseUrl}${path}`,
		close: async () => {
			harness.workerSocket?.close();
			await Promise.allSettled([
				workflowProxy.close(),
				realtimeProxy.close(),
				closeHttpServer(httpServer),
			]);
		},
	};
	return harness;
}

export async function canOpenLoopbackServer(): Promise<boolean> {
	const server = createServer();
	try {
		await listenOnPortZero(server);
		return true;
	} catch {
		return false;
	} finally {
		await closeHttpServer(server);
	}
}

export async function connectCliWorker(
	harness: TestHarness,
): Promise<WebSocket> {
	const worker = await openWebSocket(harness.url(WORKFLOW_DATA_WS_PATH));
	harness.workerSocket = worker;
	worker.on("message", (message) => {
		const frame = JSON.parse(String(message)) as { type?: unknown };
		if (frame.type !== "cli.dispatch") {
			return;
		}
		void handleWorkerMessage(String(message), toWorkerSocket(worker), {
			executeStream: async (request, emit) => {
				const invocation = {
					command: "bun",
					args: ["run", "packages/cli/src/index.ts", request.action],
				};
				const result: CliCommandExecutionResult = {
					status: "succeeded",
					request,
					invocation,
					commandResult: {
						code: 0,
						stdout: "hello from cli\n",
						stderr: "",
					},
				};
				emit({ type: "start", request, invocation });
				emit({ type: "stdout", text: "hello from cli\n" });
				emit({
					type: "progress",
					event: {
						schema: "devos.workflow.stream.v1",
						emittedAt: "2026-05-23T00:00:00.000Z",
						kind: "action",
						action: request.action,
						status: "succeeded",
					},
				});
				emit({ type: "complete", result });
				return result;
			},
		});
	});
	worker.send(
		JSON.stringify({ type: "cli.worker.ready", workerId: "worker-e2e" }),
	);
	const requestId = "worker-ping";
	worker.send(JSON.stringify({ type: "ping", requestId }));
	await waitForWorkerFrame(worker, (frame) => {
		return frame.type === "pong" && frame.requestId === requestId;
	});
	return worker;
}

function toWorkerSocket(worker: WebSocket) {
	return {
		send(message: string): void {
			worker.send(message);
		},
		close(): void {
			worker.close();
		},
		addEventListener(): void {},
	};
}

function openWebSocket(url: string): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(url);
		socket.once("open", () => resolve(socket));
		socket.once("error", reject);
	});
}

function waitForWorkerFrame(
	socket: WebSocket,
	predicate: (frame: Record<string, unknown>) => boolean,
): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const onMessage = (message: WebSocket.RawData) => {
			try {
				const frame = JSON.parse(String(message)) as Record<string, unknown>;
				if (!predicate(frame)) {
					return;
				}
				socket.off("message", onMessage);
				resolve(frame);
			} catch (error) {
				socket.off("message", onMessage);
				reject(error);
			}
		};
		socket.on("message", onMessage);
	});
}

function listenOnPortZero(server: Server): Promise<number> {
	return new Promise((resolve, reject) => {
		const onError = (error: Error) => {
			server.off("listening", onListening);
			reject(error);
		};
		const onListening = () => {
			server.off("error", onError);
			const address = server.address();
			if (!address || typeof address === "string") {
				reject(new Error("Unable to resolve websocket e2e test port"));
				return;
			}
			resolve(address.port);
		};
		server.once("error", onError);
		server.once("listening", onListening);
		server.listen(0, "127.0.0.1");
	});
}

function closeHttpServer(server: Server): Promise<void> {
	if (!server.listening) {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}
