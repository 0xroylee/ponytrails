import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import { Writable } from "node:stream";
import express, { type Express } from "express";
import {
	createExpressRequestLogger,
	listenExpressApp,
	sendWebResponse,
} from "../src/express-server";
import { createServerLogger } from "../src/logger";

describe("listenExpressApp", () => {
	it("uses the requested fixed port when non-zero", async () => {
		const calls: number[] = [];
		const app = createFakeExpress((port, _server, onListening) => {
			calls.push(port);
			queueMicrotask(() => onListening?.());
		});

		await listenExpressApp(app, 3300);
		expect(calls).toEqual([3300]);
	});

	it("resolves when listen completes before event listeners are attached", async () => {
		const app = createFakeExpress((_port, _server, onListening) => {
			onListening?.();
		});

		const server = await listenExpressApp(app, 3301);
		expect(server).toBeDefined();
	});

	it("rejects bind errors without retrying", async () => {
		const calls: number[] = [];
		const error = Object.assign(new Error("in use"), {
			code: "EADDRINUSE",
		});
		const app = createFakeExpress((port, server) => {
			calls.push(port);
			queueMicrotask(() => server.emit("error", error));
		});

		await expect(listenExpressApp(app, 0)).rejects.toBe(error);
		expect(calls).toEqual([0]);
	});

	it("forwards streamed web response chunks before the body closes", async () => {
		const encoder = new TextEncoder();
		let sendSecondChunk: (() => void) | undefined;
		const writes: string[] = [];
		const response = {
			statusCode: 0,
			headers: {} as Record<string, string>,
			status(code: number) {
				this.statusCode = code;
				return this;
			},
			setHeader(key: string, value: string) {
				this.headers[key] = value;
			},
			write(chunk: Buffer) {
				writes.push(chunk.toString());
				return true;
			},
			end() {
				writes.push("[end]");
			},
		};
		const webResponse = new Response(
			new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(encoder.encode("first"));
					sendSecondChunk = () => {
						controller.enqueue(encoder.encode("second"));
						controller.close();
					};
				},
			}),
			{ headers: { "content-type": "text/plain" } },
		);

		const sendPromise = sendWebResponse(response as never, webResponse);
		await Promise.resolve();
		expect(writes).toEqual(["first"]);

		sendSecondChunk?.();
		await sendPromise;
		expect(writes).toEqual(["first", "second", "[end]"]);
	});

	it("logs successful chat-create requests before query strings", async () => {
		const output = await createLoggedTestServer({
			method: "POST",
			originalUrl: "/api/tasks/chat-create?token=secret",
			statusCode: 201,
		});
		expect(output).toContain("INFO");
		expect(output).toContain("HTTP request completed");
		expect(output).toContain('"method":"POST"');
		expect(output).toContain('"path":"/api/tasks/chat-create"');
		expect(output).toContain('"statusCode":201');
		expect(output).toContain('"durationMs":');
		expect(output).not.toContain("token=secret");
	});

	it("logs pre-route validation failures at info level", async () => {
		const output = await createLoggedTestServer({
			method: "POST",
			originalUrl: "/api/tasks/chat-create",
			statusCode: 400,
		});
		expect(output).toContain("INFO");
		expect(output).toContain("HTTP request completed");
		expect(output).toContain('"statusCode":400');
	});

	it("logs server error responses at error level", async () => {
		const output = await createLoggedTestServer({
			method: "POST",
			originalUrl: "/api/tasks/chat-create",
			statusCode: 503,
		});
		expect(output).toContain("ERROR");
		expect(output).toContain("HTTP request failed");
		expect(output).toContain('"statusCode":503');
	});
});

function createFakeExpress(
	listenImpl: (
		port: number,
		server: EventEmitter,
		onListening?: () => void,
	) => void,
): Express {
	return {
		listen(port: number, onListening?: () => void) {
			const server = new EventEmitter() as unknown as Server;
			listenImpl(port, server as unknown as EventEmitter, onListening);
			return server;
		},
	} as unknown as Express;
}

async function createLoggedTestServer(options: {
	method: string;
	originalUrl: string;
	statusCode: number;
}): Promise<string> {
	const captured = createCapturedLogger();
	const middleware = createExpressRequestLogger(captured.logger);
	const requestLike = {
		method: options.method,
		originalUrl: options.originalUrl,
		url: options.originalUrl,
		headers: {},
		get: () => undefined,
	} as unknown as Parameters<ReturnType<typeof createExpressRequestLogger>>[0];
	const responseLike = new EventEmitter() as Parameters<
		ReturnType<typeof createExpressRequestLogger>
	>[1];
	responseLike.statusCode = options.statusCode;
	// pino-http attaches lifecycle listeners; emitting "finish" triggers final log.
	await new Promise<void>((resolve) => {
		middleware(requestLike, responseLike, resolve);
	});
	responseLike.emit("finish");
	await new Promise((resolve) => setTimeout(resolve, 0));
	return captured.output();
}

interface CapturedLogger {
	logger: ReturnType<typeof createServerLogger>;
	output(): string;
}

function createCapturedLogger(): CapturedLogger {
	let text = "";
	const destination = new Writable({
		write(chunk, _encoding, callback) {
			text += chunk.toString();
			callback();
		},
	});
	return {
		logger: createServerLogger({
			color: false,
			destination,
			env: {},
			sync: true,
		}),
		output: () => text,
	};
}
