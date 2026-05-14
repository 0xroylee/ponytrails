import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import type { Express } from "express";
import { listenExpressApp } from "../src/express-server";

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

	it("retries dynamic ports after EADDRINUSE when port is zero", async () => {
		const calls: number[] = [];
		const app = createFakeExpress((port, server) => {
			calls.push(port);
			if (calls.length === 1) {
				queueMicrotask(() =>
					server.emit("error", {
						code: "EADDRINUSE",
						message: "in use",
					}),
				);
				return;
			}
			queueMicrotask(() => server.emit("listening"));
		});

		await listenExpressApp(app, 0);
		expect(calls[0]).toBe(0);
		expect(calls.length).toBe(2);
		expect(calls[1]).toBeGreaterThan(0);
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
