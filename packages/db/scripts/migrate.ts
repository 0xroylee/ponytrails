import { initializeServerDatabase } from "../src";
import {
	parseDatabaseScriptArgs,
	printCliError,
	resolveDatabaseConfig,
} from "./cli";

export interface MigrateDatabaseOptions {
	dbPath?: string;
	port?: number;
}

export interface MigrateDatabaseResult {
	dbPath: string;
	port: number;
}

if (import.meta.main) {
	try {
		const result = await runMigrateDatabaseCli(process.argv.slice(2));
		if (result) {
			console.log(`Migrated ${result.dbPath}`);
		}
	} catch (error) {
		printCliError(error);
	}
}

export async function runMigrateDatabaseCli(
	rawArgs: string[],
): Promise<MigrateDatabaseResult | undefined> {
	const args = parseDatabaseScriptArgs(rawArgs);
	if (args.help) {
		printHelp();
		return undefined;
	}
	return migrateDatabase({ dbPath: args.dbPath });
}

export async function migrateDatabase(
	options: MigrateDatabaseOptions = {},
): Promise<MigrateDatabaseResult> {
	const { dbPath, port } = await resolveDatabaseConfig(options.dbPath, {
		port: options.port,
	});
	const database = await initializeServerDatabase(dbPath, { port });
	try {
		return { dbPath, port };
	} finally {
		await database.close();
	}
}

function printHelp(): void {
	console.log(`Run devos-db migrations.

Usage:
  bun run --filter devos-db migrate -- [--db PATH]

Options:
  --db <path>  Embedded PostgreSQL data directory
  --help, -h   Show this help`);
}
