import { describe, expect, it } from "bun:test";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	boardProjectsTable,
	boardTasksTable,
	chatSessionsTable,
} from "devos-db/schema";
import { backupDatabase } from "../scripts/backup";
import { resolveDatabaseConfig, resolveDatabasePath } from "../scripts/cli";
import { migrateDatabase } from "../scripts/migrate";
import { seedDatabase } from "../scripts/seed";
import { initializeServerDatabase } from "../src";
import { projectBoardsTable } from "../src/schema";
import {
	createDatabasePort,
	readMigrationCount,
	withDatabasePath,
} from "./helpers/database-script-helpers";

const EMBEDDED_POSTGRES_TEST_TIMEOUT_MS = 20_000;
const TEST_HOME = "/tmp/devos-home";
const INSTANCE_CONFIG_PATH = path.join(
	TEST_HOME,
	".devos",
	"config",
	"instance.config.json",
);

describe("database scripts", () => {
	describe("migrate", () => {
		it(
			"runs migrations for a fresh server database",
			() =>
				withDatabasePath(async (dbPath) => {
					const port = await createDatabasePort();

					const result = await migrateDatabase({ dbPath, port });

					expect(result).toEqual({ dbPath, port });
					const database = await initializeServerDatabase(dbPath, {
						port,
						runMigrations: false,
					});
					try {
						const migrations = await database.client.query<{ id: string }>(
							"SELECT id FROM schema_migrations ORDER BY id",
						);
						expect(migrations.rows.map((row) => row.id)).toContain(
							"0018_token_usage_cost_metadata",
						);
						const columns = await database.client.query<{
							column_name: string;
						}>(
							`
							SELECT column_name
							FROM information_schema.columns
							WHERE table_name = 'chat_sessions'
								AND column_name IN ('task_id', 'archived')
						`,
						);
						expect(columns.rows.map((row) => row.column_name).sort()).toEqual([
							"archived",
							"task_id",
						]);
					} finally {
						await database.close();
					}
				}),
			EMBEDDED_POSTGRES_TEST_TIMEOUT_MS,
		);
	});

	describe("seed", () => {
		it(
			"seeds deterministic dev data idempotently",
			() =>
				withDatabasePath(async (dbPath) => {
					const port = await createDatabasePort();

					await seedDatabase({ dbPath, port });
					await seedDatabase({ dbPath, port });

					const database = await initializeServerDatabase(dbPath, { port });
					try {
						const boards = await database.db.select().from(projectBoardsTable);
						expect(
							boards.filter((board) => board.id === "dev-board"),
						).toHaveLength(1);
					} finally {
						await database.close();
					}
				}),
			EMBEDDED_POSTGRES_TEST_TIMEOUT_MS,
		);
	});

	describe("backup", () => {
		it(
			"copies a timestamped backup without mutating the source",
			() =>
				withDatabasePath(async (dbPath) => {
					await migrateDatabase({ dbPath, port: await createDatabasePort() });

					const result = await backupDatabase({
						dbPath,
						now: new Date("2026-05-20T01:02:03.004Z"),
					});

					expect(result.sourcePath).toBe(dbPath);
					expect(result.backupPath).toBe(
						`${dbPath}.backup-20260520T010203004Z`,
					);
					await expectDirectory(dbPath);
					await expectDirectory(result.backupPath);
					await expect(readMigrationCount(dbPath)).resolves.toBeGreaterThan(0);
					await expect(
						readMigrationCount(result.backupPath),
					).resolves.toBeGreaterThan(0);
				}),
			EMBEDDED_POSTGRES_TEST_TIMEOUT_MS,
		);

		it("refuses to copy a live embedded PostgreSQL cluster", async () => {
			await withDatabasePath(async (dbPath) => {
				await mkdir(dbPath, { recursive: true });
				await writeFile(
					path.join(dbPath, "postmaster.pid"),
					String(process.pid),
				);

				await expect(backupDatabase({ dbPath })).rejects.toThrow(
					"Refusing to back up live embedded PostgreSQL cluster",
				);
			});
		});
	});

	describe("database config resolution", () => {
		it("prefers an explicit database path without reading instance config", async () => {
			await expect(
				resolveDatabasePath("/tmp/explicit-db", {
					env: {
						HOME: TEST_HOME,
						PIV_SERVER_DATABASE_PATH: "/tmp/env-db",
					},
					readText: failIfConfigRead,
				}),
			).resolves.toBe("/tmp/explicit-db");
		});

		it("uses the environment database path before instance config", async () => {
			await expect(
				resolveDatabasePath(undefined, {
					env: {
						HOME: TEST_HOME,
						PIV_SERVER_DATABASE_PATH: "/tmp/env-db",
					},
					readText: failIfConfigRead,
				}),
			).resolves.toBe("/tmp/env-db");
		});

		it("uses the instance database path and port", async () => {
			const readText = createInstanceConfigReader({
				database: {
					embeddedPostgresDataDir: "/tmp/instance-db",
					embeddedPostgresPort: 54330,
				},
			});

			await expect(
				resolveDatabasePath(undefined, {
					env: { HOME: TEST_HOME },
					readText,
				}),
			).resolves.toBe("/tmp/instance-db");
			await expect(
				resolveDatabaseConfig(undefined, {
					env: { HOME: TEST_HOME },
					readText,
				}),
			).resolves.toEqual({
				dbPath: "/tmp/instance-db",
				port: 54330,
			});
		});

		it("falls back to the repo database path when instance config is missing", async () => {
			await expect(
				resolveDatabasePath(undefined, {
					env: { HOME: TEST_HOME },
					readText: async () => {
						throw new Error("missing");
					},
				}),
			).resolves.toBe(
				path.resolve(
					import.meta.dir,
					"..",
					"..",
					"..",
					".devos",
					"config",
					"server-db",
				),
			);
		});

		it("rejects invalid instance embedded PostgreSQL ports", async () => {
			await expect(
				resolveDatabaseConfig(undefined, {
					env: { HOME: TEST_HOME },
					readText: createInstanceConfigReader({
						database: {
							embeddedPostgresDataDir: "/tmp/instance-db",
							embeddedPostgresPort: 0,
						},
					}),
				}),
			).rejects.toThrow("embeddedPostgresPort must be a positive integer port");
		});
	});

	describe("schema package exports", () => {
		it("keeps schema package exports available", () => {
			expect(boardTasksTable).toBeDefined();
			expect(boardTasksTable.id).toBeDefined();
			expect(boardProjectsTable.repoName).toBeDefined();
			expect(chatSessionsTable.taskId).toBeDefined();
		});
	});
});

async function expectDirectory(directoryPath: string): Promise<void> {
	expect((await stat(directoryPath)).isDirectory()).toBe(true);
}

async function failIfConfigRead(): Promise<string> {
	throw new Error("instance config should not be read");
}

function createInstanceConfigReader(content: unknown) {
	return async (targetPath: string, encoding: BufferEncoding) => {
		expect(targetPath).toBe(INSTANCE_CONFIG_PATH);
		expect(encoding).toBe("utf8");
		return JSON.stringify(content);
	};
}
