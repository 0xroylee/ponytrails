import { describe, expect, it } from "bun:test";
import { Writable } from "node:stream";
import { ServerDatabaseInitializationError } from "devos-db";
import { createServerLogger, normalizeError } from "../src/logger";

describe("server logger", () => {
	it("normalizes server database initialization details", () => {
		const cause = new Error("Aborted");
		const error = new ServerDatabaseInitializationError({
			cause,
			databasePath: "/tmp/server-db",
			phase: "start_cluster",
			port: 54329,
		});

		expect(normalizeError(error)).toMatchObject({
			name: "ServerDatabaseInitializationError",
			message:
				"Failed to initialize server database at /tmp/server-db on port 54329 during start_cluster: Aborted",
			databasePort: 54329,
			databasePath: "/tmp/server-db",
			phase: "start_cluster",
			cause: {
				name: "Error",
				message: "Aborted",
			},
		});
	});

	it("supports warning logs with human context fields", () => {
		const { logger, output } = createCapturedLogger();

		logger.warn({ jobId: "daily", skipped: true }, "Skipping cron run");

		const text = output();
		expect(text).toContain("WARN");
		expect(text).toContain("Skipping cron run");
		expect(text).toContain('"jobId":"daily"');
		expect(text).toContain('"skipped":true');
		expect(text).not.toContain("pid");
		expect(text).not.toContain("hostname");
	});

	it("honors PIV_LOG_LEVEL", () => {
		const { logger, output } = createCapturedLogger({
			env: { PIV_LOG_LEVEL: "warn" },
		});

		logger.info("hidden info");
		logger.warn("visible warning");

		const text = output();
		expect(text).not.toContain("hidden info");
		expect(text).toContain("visible warning");
	});
});

function createCapturedLogger(
	options: Parameters<typeof createServerLogger>[0] = {},
) {
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
			...options,
		}),
		output: () => text,
	};
}
