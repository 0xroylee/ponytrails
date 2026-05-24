import { existsSync } from "node:fs";
import { resolveDatabaseConfig } from "../packages/db/scripts/cli";
import { initializeServerDatabase } from "../packages/db/src";
import { readOptionValue } from "./script-args";

const DEFAULT_LIMIT = 20;

try {
	await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (args.help) {
		printHelp();
		return;
	}

	const { dbPath, port } = await resolveDatabaseConfig(args.db);

	if (!existsSync(dbPath)) {
		console.error(`Server database path does not exist: ${dbPath}`);
		process.exit(1);
	}

	const database = await initializeServerDatabase(dbPath, {
		port,
		runMigrations: false,
	});

	try {
		if (args.sql) {
			await runSql(database.client, args.sql);
		} else if (args.schema) {
			await printSchema(database.client);
		} else if (args.table) {
			await printTable(database.client, args.table, args.limit);
		} else {
			await printTables(database.client);
		}
	} finally {
		await database.close();
	}
}

function parseArgs(rawArgs: string[]) {
	const parsed = {
		db: undefined as string | undefined,
		help: false,
		limit: DEFAULT_LIMIT,
		schema: false,
		sql: undefined as string | undefined,
		table: undefined as string | undefined,
	};

	for (let index = 0; index < rawArgs.length; index += 1) {
		const arg = rawArgs[index];

		if (arg === "--help" || arg === "-h") {
			parsed.help = true;
			continue;
		}

		if (arg === "--tables") {
			continue;
		}

		if (arg === "--schema") {
			parsed.schema = true;
			continue;
		}

		if (arg === "--db") {
			parsed.db = readOptionValue(rawArgs, index, arg);
			index += 1;
			continue;
		}

		if (arg === "--table") {
			parsed.table = readOptionValue(rawArgs, index, arg);
			index += 1;
			continue;
		}

		if (arg === "--limit") {
			parsed.limit = parseLimit(readOptionValue(rawArgs, index, arg));
			index += 1;
			continue;
		}

		if (arg === "--sql") {
			parsed.sql = readOptionValue(rawArgs, index, arg);
			index += 1;
			continue;
		}

		throw new Error(`Unknown option: ${arg}`);
	}

	return parsed;
}

function parseLimit(value: string) {
	const limit = Number(value);
	if (!Number.isInteger(limit) || limit <= 0) {
		throw new Error("--limit must be a positive integer");
	}
	return limit;
}

async function printTables(client: QueryClient) {
	const tables = await client.query<{ table_name: string }>(`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
		AND table_type = 'BASE TABLE'
		ORDER BY table_name
	`);
	const rows = [];

	for (const table of tables.rows) {
		const count = await client.query<{ count: string }>(
			`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table.table_name)}`,
		);
		rows.push({
			table: table.table_name,
			rows: Number(count.rows[0]?.count ?? 0),
		});
	}

	console.table(rows);
}

async function printSchema(client: QueryClient) {
	const result = await client.query<{
		column_name: string;
		data_type: string;
		is_nullable: string;
		table_name: string;
	}>(`
		SELECT table_name, column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_schema = 'public'
		ORDER BY table_name, ordinal_position
	`);

	console.table(
		result.rows.map((row) => ({
			table: row.table_name,
			column: row.column_name,
			type: row.data_type,
			nullable: row.is_nullable === "YES",
		})),
	);
}

async function printTable(
	client: QueryClient,
	tableName: string,
	limit: number,
) {
	const result = await client.query(
		`SELECT * FROM ${quoteIdentifier(tableName)} LIMIT ${limit}`,
	);
	console.table(result.rows);
}

async function runSql(client: QueryClient, sql: string) {
	if (!isReadOnlySql(sql)) {
		throw new Error("--sql only accepts read-only SELECT or WITH queries");
	}

	const result = await client.query(sql);
	console.table(result.rows);
}

function isReadOnlySql(sql: string) {
	const normalized = sql
		.trim()
		.replace(/^\/\*[\s\S]*?\*\//, "")
		.trim();
	const withoutTrailingSemicolon = normalized.replace(/;\s*$/, "");
	const hasMultipleStatements = withoutTrailingSemicolon.includes(";");
	const hasWriteKeyword =
		/\b(alter|analyze|call|comment|copy|create|delete|do|drop|grant|insert|into|merge|reindex|replace|revoke|truncate|update|vacuum)\b/i.test(
			withoutTrailingSemicolon,
		);
	return (
		/^(select|with)\b/i.test(withoutTrailingSemicolon) &&
		!hasMultipleStatements &&
		!hasWriteKeyword
	);
}

function quoteIdentifier(identifier: string) {
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
		throw new Error(`Invalid table name: ${identifier}`);
	}
	return `"${identifier.replaceAll('"', '""')}"`;
}

interface QueryClient {
	query<T extends Record<string, unknown> = Record<string, unknown>>(
		sql: string,
		values?: unknown[],
	): Promise<{ rows: T[] }>;
}

function printHelp() {
	console.log(`View the embedded PostgreSQL server database.

Usage:
  bun run db:view [--tables|--schema|--table <name>|--sql <query>]

Options:
  --db <path>      Embedded PostgreSQL data directory
  --limit <count>  Row limit for --table (${DEFAULT_LIMIT})
  --help, -h       Show this help
Default DB path: configured instance DB, then repo-local .devos/config/server-db fallback`);
}
