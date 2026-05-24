import type { HealthRequestOptions } from "./client.types";
import type {
	CliCommandStreamEvent,
	CliCommandStreamHandler,
	CliCommandStreamRequest,
} from "./command-stream-client.types";

export interface CommandStreamApiMethods {
	streamCliCommand(
		request: CliCommandStreamRequest,
		onEvent: CliCommandStreamHandler,
		options?: HealthRequestOptions,
	): Promise<void>;
}

export function createCommandStreamApiMethods(
	wsUrl: string,
	WebSocketImpl: typeof WebSocket = WebSocket,
): CommandStreamApiMethods {
	return {
		streamCliCommand(request, onEvent, options) {
			return streamCommandOverWebSocket(
				resolveBrowserWsUrl(wsUrl),
				WebSocketImpl,
				request,
				onEvent,
				options,
			);
		},
	};
}

function streamCommandOverWebSocket(
	url: string,
	WebSocketImpl: typeof WebSocket,
	request: CliCommandStreamRequest,
	onEvent: CliCommandStreamHandler,
	options?: HealthRequestOptions,
): Promise<void> {
	const requestId = crypto.randomUUID();
	const socket = new WebSocketImpl(url);
	return new Promise((resolve, reject) => {
		let settled = false;
		const settle = (callback: () => void) => {
			if (settled) {
				return;
			}
			settled = true;
			options?.signal?.removeEventListener("abort", abort);
			callback();
		};
		const abort = () => {
			socket.close();
			settle(() => reject(new DOMException("Aborted", "AbortError")));
		};
		options?.signal?.addEventListener("abort", abort, { once: true });
		socket.addEventListener("open", () => {
			socket.send(JSON.stringify({ type: "command", requestId, request }));
		});
		socket.addEventListener("message", (event) => {
			const frame = parseWebSocketFrame(String(event.data));
			if (!frame || frame.requestId !== requestId) {
				return;
			}
			if (isCommandStreamFrame(frame)) {
				onEvent(toCommandStreamEvent(frame));
			}
			if (frame.type === "complete") {
				settle(resolve);
				socket.close();
			}
		});
		socket.addEventListener("error", () => {
			settle(() => reject(new Error("CLI stream websocket failed")));
		});
		socket.addEventListener("close", () => {
			settle(() => reject(new Error("CLI stream websocket closed")));
		});
	});
}

function isCommandStreamFrame(
	frame:
		| (CliCommandStreamEvent & { requestId: string })
		| { type: "ready" | "pong"; requestId?: string },
): frame is CliCommandStreamEvent & { requestId: string } {
	return frame.type !== "ready" && frame.type !== "pong";
}

function parseWebSocketFrame(
	input: string,
):
	| (CliCommandStreamEvent & { requestId: string })
	| { type: "ready" | "pong"; requestId?: string }
	| undefined {
	try {
		return JSON.parse(input);
	} catch {
		return undefined;
	}
}

function toCommandStreamEvent(
	frame: CliCommandStreamEvent & { requestId: string },
): CliCommandStreamEvent {
	const { requestId: _requestId, ...event } = frame;
	return event;
}

function resolveBrowserWsUrl(wsUrl: string): string {
	if (typeof window === "undefined" || !wsUrl.startsWith("/")) {
		return wsUrl;
	}
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${window.location.host}${wsUrl}`;
}
