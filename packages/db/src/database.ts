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
	if ((await resolveDatabaseEngine(options)) === "pglite") {
		return initializePgliteServerDatabase(resolvedPath, options);
	}

	const settings = await resolveSettings(options);
	let postgres: EmbeddedPostgres | undefined;
	let client: Pool | undefined;
	let phase: ServerDatabaseInitializationPhase = "create_directory";

	try {
		await mkdir(path.dirname(resolvedPath), { recursive: true });

		await hydrateEmbeddedPostgresNativeSymlinks();
		postgres = createEmbeddedPostgres(resolvedPath, settings);

		phase = "initialise_cluster";
		await initialiseClusterIfNeeded(resolvedPath, postgres);

		phase = "start_cluster";
		await postgres.start();

		phase = "create_database";
		await ensureDatabaseExists(postgres, settings.databaseName);
		client = createPool(settings);

		if (settings.runMigrations) {
			phase = "run_migrations";
			const migrationClient = await client.connect();
			try {
				await runMigrations(migrationClient);
			} finally {
				migrationClient.release();
			}
		}

		phase = "bind_drizzle";
		const initializedClient = client;
		const db = drizzle({ client: initializedClient, schema });
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
		await closePartialClient(client, postgres);
		throw new ServerDatabaseInitializationError({
			cause: error,
			databasePath: resolvedPath,
			phase,
			port: settings.port,
		});
	}
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
