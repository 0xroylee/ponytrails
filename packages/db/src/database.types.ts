import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type * as schema from "./schema";

export type ServerDatabaseInitializationPhase =
	| "create_directory"
	| "initialise_cluster"
	| "start_cluster"
	| "create_database"
	| "run_migrations"
	| "bind_drizzle";

export interface InitializeServerDatabaseOptions {
	databaseName?: string;
	logDatabaseProcess?: boolean;
	password?: string;
	port?: number;
	runMigrations?: boolean;
	user?: string;
}

export interface ServerDatabase {
	client: Pool;
	databasePath: string;
	db: NodePgDatabase<typeof schema>;
	port: number;
	close(): Promise<void>;
}

export type ServerDb = ServerDatabase["db"];
