import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import type { RawData } from "ws";
import type { RealtimeEventBus } from "../realtime";

export interface RealtimeEventsSocket {
	readyState: number;
	send(message: string): void;
	close(): void;
	on(event: "close", listener: () => void): this;
}

export interface RealtimeEventsProxyOptions {
	server: Server;
	path: string;
	eventBus: RealtimeEventBus;
}

export interface RealtimeEventsProxy {
	close(): Promise<void>;
}

export interface RealtimeEventsWebSocketServer {
	handleUpgrade(
		request: IncomingMessage,
		socket: Duplex,
		head: Buffer,
		callback: (client: RealtimeEventsSocket) => void,
	): void;
	emit(event: "connection", client: RealtimeEventsSocket): boolean;
	on(
		event: "connection",
		listener: (client: RealtimeEventsSocket) => void,
	): this;
	close(callback: (error?: Error) => void): void;
}

export type RealtimeRawData = RawData;
