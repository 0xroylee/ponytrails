import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { QueryResultRow } from "pg";
import { ServerDatabaseInitializationError } from "./database-error";
import { runMigrations } from "./migrations";
import * as schema from "./schema";
import type {
	InitializeServerDatabaseOptions,
	ServerDatabase,
	ServerDatabaseClient,
	ServerDatabaseInitializationPhase,
} from "./types/database.types";

const DEFAULT_PGLITE_PORT = 54329;

export async function initializePgliteServerDatabase(
	resolvedPath: string,
	options: InitializeServerDatabaseOptions,
): Promise<ServerDatabase> {
	const port = options.port ?? DEFAULT_PGLITE_PORT;
	let client: PGlite | undefined;
	let phase: ServerDatabaseInitializationPhase = "create_directory";

	try {
		await mkdir(path.dirname(resolvedPath), { recursive: true });
		client = new PGlite(resolvedPath);
		const queryClient = createPgliteQueryClient(client);

		if (options.runMigrations ?? true) {
			phase = "run_migrations";
			await runMigrations(queryClient);
		}

		phase = "bind_drizzle";
		return {
			client: queryClient,
			databasePath: resolvedPath,
			db: drizzle({ client, schema }) as unknown as ServerDatabase["db"],
			port,
			async close() {
				await client?.close();
			},
		};
	} catch (error) {
		await client?.close().catch(() => undefined);
		throw new ServerDatabaseInitializationError({
			cause: error,
			databasePath: resolvedPath,
			phase,
			port,
		});
	}
}

function createPgliteQueryClient(client: PGlite): ServerDatabaseClient {
	return {
		async query<T extends QueryResultRow = QueryResultRow>(
			sql: string,
			values?: unknown[],
		) {
			if (!values?.length) {
				const results = await client.exec(sql);
				return { rows: (results.at(-1)?.rows ?? []) as T[] };
			}
			const result = await client.query<T>(sql, values);
			return { rows: result.rows };
		},
		async end() {
			await client.close();
		},
	};
}
