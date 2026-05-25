import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { ServerDatabaseInitializationError } from "./database-error";
import { canOpenLoopbackPort, findAvailablePort } from "./database-port";
import { hydrateEmbeddedPostgresNativeSymlinks } from "./embedded-postgres-symlinks";
import { runMigrations } from "./migrations";
import { initializePgliteServerDatabase } from "./pglite-database";
import * as schema from "./schema";
import type {
	EmbeddedPostgresSettings,
	InitializeServerDatabaseOptions,
	ServerDatabase,
	ServerDatabaseEngine,
	ServerDatabaseInitializationPhase,
} from "./types/database.types";

export const DEFAULT_EMBEDDED_POSTGRES_PORT = 54329;
export const DEFAULT_EMBEDDED_POSTGRES_DATABASE = "devos";
export const DEFAULT_EMBEDDED_POSTGRES_USER = "postgres";
export const DEFAULT_EMBEDDED_POSTGRES_PASSWORD = "devos-local";

export async function initializeServerDatabase(
	databasePath: string,
	options: InitializeServerDatabaseOptions = {},
): Promise<ServerDatabase> {
	const resolvedPath = path.resolve(databasePath);
	const engine = await resolveDatabaseEngine(options);
	if (engine === "pglite") {
		return initializePgliteServerDatabase(resolvedPath, options);
	}

	const settings = await resolveSettings(options);
	const emitPhase = createDatabasePhaseEmitter(
		options,
		"embedded-postgres",
		resolvedPath,
		settings.port,
	);
	let clusterStarted = false;
	let postgres: EmbeddedPostgres | undefined;
	let client: Pool | undefined;
	let phase: ServerDatabaseInitializationPhase = "create_directory";

	try {
		emitPhase(phase, "start");
		await mkdir(path.dirname(resolvedPath), { recursive: true });
		emitPhase(phase, "done");

		phase = "hydrate_native_symlinks";
		emitPhase(phase, "start");
		await hydrateEmbeddedPostgresNativeSymlinks();
		emitPhase(phase, "done");
		postgres = createEmbeddedPostgres(resolvedPath, settings);

		phase = "initialise_cluster";
		emitPhase(phase, "start");
		await initialiseClusterIfNeeded(resolvedPath, postgres);
		emitPhase(phase, "done");

		phase = "start_cluster";
		emitPhase(phase, "start");
		await postgres.start();
		clusterStarted = true;
		emitPhase(phase, "done");

		phase = "create_database";
		emitPhase(phase, "start");
		await ensureDatabaseExists(postgres, settings.databaseName);
		client = createPool(settings);
		emitPhase(phase, "done");

		if (settings.runMigrations) {
			phase = "run_migrations";
			emitPhase(phase, "start");
			const migrationClient = await client.connect();
			try {
				await runMigrations(migrationClient);
			} finally {
				migrationClient.release();
			}
			emitPhase(phase, "done");
		}

		phase = "bind_drizzle";
		emitPhase(phase, "start");
		const initializedClient = client;
		const db = drizzle({ client: initializedClient, schema });
		emitPhase(phase, "done");
		return {
			client: initializedClient,
			databasePath: resolvedPath,
			db,
			port: settings.port,
			async close() {
				await initializedClient.end();
				await postgres?.stop();
			},
		};
	} catch (error) {
		emitPhase(phase, "failed", toErrorMessage(error));
		emitPhase("cleanup_partial_client", "start");
		await closePartialClient(client, clusterStarted ? postgres : undefined);
		emitPhase("cleanup_partial_client", "done");
		throw new ServerDatabaseInitializationError({
			cause: error,
			databasePath: resolvedPath,
			phase,
			port: settings.port,
		});
	}
}

function createDatabasePhaseEmitter(
	options: InitializeServerDatabaseOptions,
	engine: ServerDatabaseEngine,
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
			engine,
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

export { ServerDatabaseInitializationError } from "./database-error";

async function resolveDatabaseEngine(
	options: InitializeServerDatabaseOptions,
): Promise<ServerDatabaseEngine> {
	if (options.engine) {
		return options.engine;
	}
	if (
		process.env.DEVOS_DB_ENGINE === "pglite" ||
		process.env.DEVOS_DB_ENGINE === "embedded-postgres"
	) {
		return process.env.DEVOS_DB_ENGINE;
	}
	return process.env.CODEX_SANDBOX === "seatbelt" ||
		process.env.CODEX_SANDBOX_NETWORK_DISABLED === "1" ||
		!(await canOpenLoopbackPort())
		? "pglite"
		: "embedded-postgres";
}

async function resolveSettings(
	options: InitializeServerDatabaseOptions,
): Promise<EmbeddedPostgresSettings> {
	return {
		databaseName: options.databaseName ?? DEFAULT_EMBEDDED_POSTGRES_DATABASE,
		logDatabaseProcess: options.logDatabaseProcess ?? false,
		password: options.password ?? DEFAULT_EMBEDDED_POSTGRES_PASSWORD,
		port: options.port ?? (await findAvailablePort()),
		runMigrations: options.runMigrations ?? true,
		user: options.user ?? DEFAULT_EMBEDDED_POSTGRES_USER,
	};
}

function createEmbeddedPostgres(
	databaseDir: string,
	settings: EmbeddedPostgresSettings,
): EmbeddedPostgres {
	const onLog = settings.logDatabaseProcess ? console.log : () => {};
	const onError = settings.logDatabaseProcess ? console.error : () => {};
	return new EmbeddedPostgres({
		authMethod: "password",
		databaseDir,
		password: settings.password,
		persistent: true,
		port: settings.port,
		user: settings.user,
		onError,
		onLog,
		postgresFlags: ["-h", "127.0.0.1"],
	});
}

async function initialiseClusterIfNeeded(
	databasePath: string,
	postgres: EmbeddedPostgres,
): Promise<void> {
	const state = await readClusterState(databasePath);
	if (state === "initialized") {
		return;
	}
	if (state === "dirty") {
		throw new Error(
			`Database directory is not an embedded PostgreSQL cluster: ${databasePath}`,
		);
	}
	await postgres.initialise();
}

async function readClusterState(
	databasePath: string,
): Promise<"missing" | "empty" | "initialized" | "dirty"> {
	if (await pathExists(path.join(databasePath, "PG_VERSION"))) {
		return "initialized";
	}
	try {
		const entries = await readdir(databasePath);
		return entries.length === 0 ? "empty" : "dirty";
	} catch {
		return "missing";
	}
}

async function ensureDatabaseExists(
	postgres: EmbeddedPostgres,
	databaseName: string,
): Promise<void> {
	const client = postgres.getPgClient("postgres", "127.0.0.1");
	await client.connect();
	try {
		const existing = await client.query<{ datname: string }>(
			"SELECT datname FROM pg_database WHERE datname = $1",
			[databaseName],
		);
		if (existing.rows.length > 0) {
			return;
		}
		await client.query(
			`CREATE DATABASE ${client.escapeIdentifier(databaseName)}`,
		);
	} finally {
		await client.end();
	}
}

function createPool(settings: EmbeddedPostgresSettings): Pool {
	return new Pool({
		database: settings.databaseName,
		host: "127.0.0.1",
		password: settings.password,
		port: settings.port,
		user: settings.user,
	});
}

async function closePartialClient(
	client: Pool | undefined,
	postgres: EmbeddedPostgres | undefined,
): Promise<void> {
	try {
		await client?.end();
	} catch {
		// Preserve the startup failure as the primary error.
	}
	try {
		await postgres?.stop();
	} catch {
		// Preserve the startup failure as the primary error.
	}
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
}
