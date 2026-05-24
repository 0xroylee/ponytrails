import { mkdir, readdir, stat } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import type {
	InitializeServerDatabaseOptions,
	ServerDatabase,
	ServerDatabaseInitializationPhase,
} from "./database.types";
import { hydrateEmbeddedPostgresNativeSymlinks } from "./embedded-postgres-symlinks";
import { runMigrations } from "./migrations";
import * as schema from "./schema";

export const DEFAULT_EMBEDDED_POSTGRES_PORT = 54329;
export const DEFAULT_EMBEDDED_POSTGRES_DATABASE = "devos";
export const DEFAULT_EMBEDDED_POSTGRES_USER = "postgres";
export const DEFAULT_EMBEDDED_POSTGRES_PASSWORD = "devos-local";

interface InitializationErrorInput {
	cause: unknown;
	databasePath: string;
	phase: ServerDatabaseInitializationPhase;
	port: number;
}

export class ServerDatabaseInitializationError extends Error {
	readonly databasePath: string;
	readonly phase: ServerDatabaseInitializationPhase;
	readonly port: number;

	constructor(input: InitializationErrorInput) {
		const causeMessage =
			input.cause instanceof Error ? input.cause.message : String(input.cause);
		super(
			`Failed to initialize server database at ${input.databasePath} on port ${input.port} during ${input.phase}: ${causeMessage}`,
			{ cause: input.cause },
		);
		this.name = "ServerDatabaseInitializationError";
		this.databasePath = input.databasePath;
		this.phase = input.phase;
		this.port = input.port;
	}
}

export async function initializeServerDatabase(
	databasePath: string,
	options: InitializeServerDatabaseOptions = {},
): Promise<ServerDatabase> {
	const resolvedPath = path.resolve(databasePath);
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

async function resolveSettings(
	options: InitializeServerDatabaseOptions,
): Promise<Required<InitializeServerDatabaseOptions>> {
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
	settings: Required<InitializeServerDatabaseOptions>,
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

function createPool(settings: Required<InitializeServerDatabaseOptions>): Pool {
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

async function findAvailablePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			server.close(() => {
				if (typeof address === "object" && address?.port) {
					resolve(address.port);
					return;
				}
				reject(new Error("Unable to allocate an embedded PostgreSQL port"));
			});
		});
	});
}
