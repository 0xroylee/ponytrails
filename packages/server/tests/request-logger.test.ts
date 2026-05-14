import { describe, expect, it } from "bun:test";
import { withRequestLogging } from "../src/http/request-logger";
import type { ServerLogContext, ServerLogger } from "../src/logger.types";

interface LogEntry {
	level: "info" | "error" | "fatal";
	context: ServerLogContext;
	message: string;
}

describe("request logger", () => {
	it("logs successful requests with method, path, status, and duration", async () => {
		const entries: LogEntry[] = [];
		const app = withRequestLogging(
			async () => Response.json({ ok: true }, { status: 201 }),
			createLogger(entries),
			createClock(100, 137),
		);

		const response = await app(
			new Request("http://localhost/api/jobs?token=secret", {
				method: "POST",
			}),
		);

		expect(response.status).toBe(201);
		expect(entries).toEqual([
			{
				level: "info",
				context: {
					method: "POST",
					path: "/api/jobs",
					statusCode: 201,
					durationMs: 37,
				},
				message: "HTTP request completed",
			},
		]);
	});

	it("logs server error responses at error level", async () => {
		const entries: LogEntry[] = [];
		const app = withRequestLogging(
			async () => Response.json({ error: "boom" }, { status: 503 }),
			createLogger(entries),
			createClock(5, 8),
		);

		const response = await app(new Request("http://localhost/api/jobs"));

		expect(response.status).toBe(503);
		expect(entries).toEqual([
			{
				level: "error",
				context: {
					method: "GET",
					path: "/api/jobs",
					statusCode: 503,
					durationMs: 3,
				},
				message: "HTTP request completed",
			},
		]);
	});

	it("logs thrown request failures and rethrows", async () => {
		const entries: LogEntry[] = [];
		const failure = new Error("route failed");
		const app = withRequestLogging(
			async () => {
				throw failure;
			},
			createLogger(entries),
			createClock(20, 24),
		);

		await expect(app(new Request("http://localhost/api/jobs"))).rejects.toThrow(
			"route failed",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.level).toBe("error");
		expect(entries[0]?.message).toBe("HTTP request failed");
		expect(entries[0]?.context).toMatchObject({
			method: "GET",
			path: "/api/jobs",
			durationMs: 4,
			err: {
				name: "Error",
				message: "route failed",
			},
		});
	});
});

function createLogger(entries: LogEntry[]): ServerLogger {
	return {
		info: (context, message) => {
			entries.push({ level: "info", context, message });
		},
		error: (context, message) => {
			entries.push({ level: "error", context, message });
		},
		fatal: (context, message) => {
			entries.push({ level: "fatal", context, message });
		},
	};
}

function createClock(...ticks: number[]): () => number {
	let index = 0;
	return () => ticks[index++] ?? ticks.at(-1) ?? 0;
}
