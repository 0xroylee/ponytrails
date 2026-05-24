import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import { Writable } from "node:stream";
import type {
	Express,
	Request as ExpressRequest,
	Response as ExpressResponse,
} from "express";
import {
	createExpressRequestLogger,
	listenExpressApp,
	sendWebResponse,
} from "../src/express-server";
import { createServerLogger } from "../src/logger";

describe("listenExpressApp", () => {
	it("uses the requested fixed port when non-zero", async () => {
		const calls: number[] = [];
		const app = createFakeExpress((port, server) => {
			calls.push(port);
			queueMicrotask(() => server.emit("listening"));
		});

		await listenExpressApp(app, 3300);
		expect(calls).toEqual([3300]);
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
		const captured = createCapturedLogger();
		await emitLoggedRequest(captured.logger, {
			method: "POST",
			pathname: "/api/tasks/chat-create",
			rawUrl: "/api/tasks/chat-create?token=secret",
			statusCode: 201,
		});
		const output = captured.output();
		expect(output).toContain("INFO");
		expect(output).toContain("HTTP request completed");
		expect(output).toContain('"method":"POST"');
		expect(output).toContain('"path":"/api/tasks/chat-create"');
		expect(output).toContain('"statusCode":201');
		expect(output).toContain('"durationMs":');
		expect(output).not.toContain("token=secret");
	});

	it("logs pre-route validation failures at info level", async () => {
		const captured = createCapturedLogger();
		await emitLoggedRequest(captured.logger, {
			method: "POST",
			pathname: "/api/tasks/chat-create",
			rawUrl: "/api/tasks/chat-create",
			statusCode: 400,
		});
		const output = captured.output();
		expect(output).toContain("INFO");
		expect(output).toContain("HTTP request completed");
		expect(output).toContain('"statusCode":400');
	});

	it("logs server error responses at error level", async () => {
		const captured = createCapturedLogger();
		await emitLoggedRequest(captured.logger, {
			method: "POST",
			pathname: "/api/tasks/chat-create",
			rawUrl: "/api/tasks/chat-create",
			statusCode: 503,
		});
		const output = captured.output();
		expect(output).toContain("ERROR");
		expect(output).toContain("HTTP request failed");
		expect(output).toContain('"statusCode":503');
	});
});

function createFakeExpress(
	listenImpl: (port: number, server: EventEmitter) => void,
): Express {
	return {
		listen(port: number) {
			const server = new EventEmitter() as unknown as Server;
			listenImpl(port, server as unknown as EventEmitter);
			return server;
		},
	} as unknown as Express;
}

async function emitLoggedRequest(
	logger: ReturnType<typeof createServerLogger>,
	input: {
		method: string;
		pathname: string;
		rawUrl: string;
		statusCode: number;
	},
): Promise<void> {
	const middleware = createExpressRequestLogger(logger);
	const request = {
		method: input.method,
		originalUrl: input.rawUrl,
		path: input.pathname,
		url: input.rawUrl,
		headers: {},
	} as ExpressRequest;
	const response = Object.assign(new EventEmitter(), {
		statusCode: 200,
	}) as ExpressResponse;
	middleware(request, response, () => {
		response.statusCode = input.statusCode;
		response.emit("finish");
	});
	await Promise.resolve();
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
