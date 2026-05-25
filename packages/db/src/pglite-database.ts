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
	const emitPhase = createPglitePhaseEmitter(options, resolvedPath, port);
	let client: PGlite | undefined;
	let phase: ServerDatabaseInitializationPhase = "create_directory";

	try {
		emitPhase(phase, "start");
		await mkdir(path.dirname(resolvedPath), { recursive: true });
		emitPhase(phase, "done");
		client = new PGlite(resolvedPath);
		const queryClient = createPgliteQueryClient(client);

		if (options.runMigrations ?? true) {
			phase = "run_migrations";
			emitPhase(phase, "start");
			await runMigrations(queryClient);
			emitPhase(phase, "done");
		}

		phase = "bind_drizzle";
		emitPhase(phase, "start");
		const db = drizzle({ client, schema }) as unknown as ServerDatabase["db"];
		emitPhase(phase, "done");
		return {
			client: queryClient,
			databasePath: resolvedPath,
			db,
			port,
			async close() {
				await client?.close();
			},
		};
	} catch (error) {
		emitPhase(phase, "failed", toErrorMessage(error));
		emitPhase("cleanup_partial_client", "start");
		await client?.close().catch(() => undefined);
		emitPhase("cleanup_partial_client", "done");
		throw new ServerDatabaseInitializationError({
			cause: error,
			databasePath: resolvedPath,
			phase,
			port,
		});
	}
}

function createPglitePhaseEmitter(
	options: InitializeServerDatabaseOptions,
	databasePath: string,
	port: number,
): (
	phase: ServerDatabaseInitializationPhase,
	status: "start" | "done" | "failed",
	errorMessage?: string,
) => void {
	return (phase, status, errorMessage) => {
		options.onInitializationPhase?.({
			databasePath,
			engine: "pglite",
			errorMessage,
			phase,
			port,
			status,
		});
	};
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return error === undefined ? "Unknown error" : String(error);
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
