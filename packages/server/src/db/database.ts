import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { ServerDatabase } from "./database.types";
import { runMigrations } from "./migrations";
import * as schema from "./schema";

export async function initializeServerDatabase(
	databasePath: string,
): Promise<ServerDatabase> {
	const resolvedPath = path.resolve(databasePath);
	await mkdir(path.dirname(resolvedPath), { recursive: true });
	const client = new PGlite(resolvedPath);
	await runMigrations(client);
	const db = drizzle({ client, schema });
	return {
		client,
		db,
		async close() {
			await client.close();
		},
	};
}
