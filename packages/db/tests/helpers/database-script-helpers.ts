import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { initializeServerDatabase } from "../../src";

export async function withDatabasePath<T>(
	run: (dbPath: string) => Promise<T>,
): Promise<T> {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "devos-db-test-"));
	try {
		return await run(path.join(tempDir, "server-db"));
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

export async function createDatabasePort(): Promise<number> {
	if (
		process.env.CODEX_SANDBOX === "seatbelt" ||
		process.env.CODEX_SANDBOX_NETWORK_DISABLED === "1"
	) {
		return 54329;
	}
	return new Promise((resolve) => {
		const server = createServer();
		server.once("error", () => resolve(54329));
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			server.close(() => {
				if (typeof address === "object" && address?.port) {
					resolve(address.port);
					return;
				}
				resolve(54329);
			});
		});
	});
}

export async function readMigrationCount(dbPath: string): Promise<number> {
	const database = await initializeServerDatabase(dbPath, {
		runMigrations: false,
	});
	try {
		const result = await database.client.query<{ count: string }>(
			"SELECT COUNT(*) AS count FROM schema_migrations",
		);
		return Number(result.rows[0]?.count ?? 0);
	} finally {
		await database.close();
	}
}
