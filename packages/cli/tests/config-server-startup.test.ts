import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadServerStartupConfig } from "../src/features/config";

let tempDir: string | undefined;
let previousDatabasePath: string | undefined;

afterEach(async () => {
	if (previousDatabasePath === undefined) {
		process.env.PIV_SERVER_DATABASE_PATH = undefined;
	} else {
		process.env.PIV_SERVER_DATABASE_PATH = previousDatabasePath;
	}
	previousDatabasePath = undefined;
	if (tempDir) {
		await rm(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	}
});

describe("loadServerStartupConfig", () => {
	it("resolves startup config without opening server DB metadata", async () => {
		tempDir = await mkdtemp(
			path.join(process.cwd(), ".tmp-server-startup-config-"),
		);
		const databasePath = path.join(tempDir, "server-db-file");
		previousDatabasePath = process.env.PIV_SERVER_DATABASE_PATH;
		process.env.PIV_SERVER_DATABASE_PATH = databasePath;
		await writeFile(databasePath, "not a pglite directory");

		const config = await loadServerStartupConfig(tempDir);

		expect(config.projects[0]?.server.database.databasePath).toBe(databasePath);
	});
});
