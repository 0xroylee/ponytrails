import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import type { RealtimeEventBus } from "../realtime";
import type {
	RealtimeEventsProxy,
	RealtimeEventsProxyOptions,
	RealtimeEventsSocket,
	RealtimeEventsWebSocketServer,
} from "./realtime-events.types";

export function attachRealtimeEventsSocket(
	options: RealtimeEventsProxyOptions,
): RealtimeEventsProxy {
	const webSocketServer = new WebSocketServer({ noServer: true });
	const onUpgrade = (
		request: IncomingMessage,
		socket: Duplex,
		head: Buffer,
	): void => {
		if (!shouldHandleRealtimeUpgrade(request, options.path)) {
			return;
		}
		webSocketServer.handleUpgrade(request, socket, head, (client) => {
			webSocketServer.emit("connection", client);
		});
	};

	webSocketServer.on("connection", (client) => {
		bindRealtimeEventsClient(client, options.eventBus);
	});
	options.server.on("upgrade", onUpgrade);

	return {
		close: () =>
			new Promise((resolve, reject) => {
				options.server.off("upgrade", onUpgrade);
				webSocketServer.close((error) => (error ? reject(error) : resolve()));
			}),
	};
}

export function bindRealtimeEventsClient(
	client: RealtimeEventsSocket,
	eventBus: RealtimeEventBus,
): () => void {
	const unsubscribe = eventBus.subscribe((event) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(event));
		}
	});
	client.on("close", unsubscribe);
	return unsubscribe;
}

export function shouldHandleRealtimeUpgrade(
	request: IncomingMessage,
	path: string,
): boolean {
	const url = new URL(request.url ?? "/", "http://localhost");
	return url.pathname === path;
}
