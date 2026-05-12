import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/features/server/db/schema";

export interface DrizzleServerTestDatabase {
	db: ReturnType<typeof drizzle<typeof schema>>;
	cleanup(): Promise<void>;
}

export async function createDrizzleServerTestDatabase(): Promise<DrizzleServerTestDatabase> {
	const client = new PGlite();
	await client.exec(`
		CREATE TABLE token_usage (
			id text PRIMARY KEY,
			run_id text NOT NULL,
			stage text NOT NULL,
			input_tokens integer NOT NULL,
			output_tokens integer NOT NULL,
			total_tokens integer NOT NULL,
			recorded_at timestamp NOT NULL
		);
		CREATE TABLE jobs (
			id text PRIMARY KEY,
			project_id text NOT NULL,
			issue_key text NOT NULL,
			stage text NOT NULL,
			status text NOT NULL,
			created_at timestamp NOT NULL
		);
		CREATE TABLE agents (
			id text PRIMARY KEY,
			name text NOT NULL,
			backend text NOT NULL,
			model text NOT NULL,
			created_at timestamp NOT NULL
		);
		CREATE TABLE skills (
			id text PRIMARY KEY,
			name text NOT NULL,
			description text NOT NULL,
			source text NOT NULL,
			updated_at timestamp NOT NULL
		);
		CREATE TABLE command_history (
			id text PRIMARY KEY,
			command text NOT NULL,
			exit_code integer NOT NULL,
			executed_at timestamp NOT NULL
		);
	`);
	const db = drizzle({ client, schema });

	return {
		db,
		async cleanup() {
			await client.close();
		},
	};
}
