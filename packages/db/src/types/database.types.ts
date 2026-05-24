import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { QueryResultRow } from "pg";
import type * as schema from "../schema";

export type ServerDatabaseInitializationPhase =
	| "create_directory"
	| "initialise_cluster"
	| "start_cluster"
	| "create_database"
	| "run_migrations"
	| "bind_drizzle";

export type ServerDatabaseEngine = "embedded-postgres" | "pglite";

export type EmbeddedPostgresSettings = Required<
	Omit<InitializeServerDatabaseOptions, "engine">
>;

export interface ServerDatabaseInitializationErrorInput {
	cause: unknown;
	databasePath: string;
	phase: ServerDatabaseInitializationPhase;
	port: number;
}

export interface ServerDatabaseClient {
	query<T extends QueryResultRow = QueryResultRow>(
		sql: string,
		values?: unknown[],
	): Promise<{ rows: T[] }>;
	end?(): Promise<void>;
}

export interface InitializeServerDatabaseOptions {
	databaseName?: string;
	engine?: ServerDatabaseEngine;
	logDatabaseProcess?: boolean;
	password?: string;
	port?: number;
	runMigrations?: boolean;
	user?: string;
}

export interface ServerDatabase {
	client: ServerDatabaseClient;
	databasePath: string;
	db: NodePgDatabase<typeof schema>;
	port: number;
	close(): Promise<void>;
}

export type ServerDb = ServerDatabase["db"];
