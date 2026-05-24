import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readOptionValue } from "../../../scripts/script-args";
import { DEFAULT_EMBEDDED_POSTGRES_PORT } from "../src";
export { readOptionValue } from "../../../scripts/script-args";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");
const DEFAULT_DB_PATH = path.join(REPO_ROOT, ".devos", "config", "server-db");
const INSTANCE_CONFIG_FILE = "instance.config.json";

export interface ResolveDatabasePathOptions {
	env?: NodeJS.ProcessEnv;
	port?: number;
	readText?: (targetPath: string, encoding: BufferEncoding) => Promise<string>;
}

export interface ResolvedDatabaseConfig {
	dbPath: string;
	port: number;
}

export interface DatabaseScriptArgs {
	dbPath?: string;
	help: boolean;
}

export function parseDatabaseScriptArgs(rawArgs: string[]): DatabaseScriptArgs {
	const parsed: DatabaseScriptArgs = { help: false };
	for (let index = 0; index < rawArgs.length; index += 1) {
		const arg = rawArgs[index];
		if (arg === "--help" || arg === "-h") {
			parsed.help = true;
			continue;
		}
		if (arg === "--db") {
			parsed.dbPath = readOptionValue(rawArgs, index, arg);
			index += 1;
			continue;
		}
		throw new Error(`Unknown option: ${arg}`);
	}
	return parsed;
}

export async function resolveDatabasePath(
	dbPath: string | undefined,
	options: ResolveDatabasePathOptions = {},
): Promise<string> {
	return (await resolveDatabaseConfig(dbPath, options)).dbPath;
}

export async function resolveDatabaseConfig(
	dbPath: string | undefined,
	options: ResolveDatabasePathOptions = {},
): Promise<ResolvedDatabaseConfig> {
	const env = options.env ?? process.env;
	const defaultPort = options.port ?? DEFAULT_EMBEDDED_POSTGRES_PORT;
	const explicitPath = normalizeOptionalValue(dbPath);
	if (explicitPath) {
		return { dbPath: path.resolve(explicitPath), port: defaultPort };
	}
	const envPath = normalizeOptionalValue(env.PIV_SERVER_DATABASE_PATH);
	if (envPath) {
		return { dbPath: path.resolve(envPath), port: defaultPort };
	}
	const instanceConfig = await loadInstanceDatabaseConfig(options);
	const port =
		options.port ?? instanceConfig?.port ?? DEFAULT_EMBEDDED_POSTGRES_PORT;
	if (instanceConfig?.dbPath) {
		return { dbPath: path.resolve(instanceConfig.dbPath), port };
	}
	return { dbPath: DEFAULT_DB_PATH, port };
}

export function printCliError(error: unknown): never {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

async function loadInstanceDatabaseConfig(
	options: ResolveDatabasePathOptions,
): Promise<Partial<ResolvedDatabaseConfig> | undefined> {
	const env = options.env ?? process.env;
	const readText = options.readText ?? readFile;
	let content: string;
	try {
		content = await readText(instanceConfigPath(env), "utf8");
	} catch {
		return undefined;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return undefined;
	}
	if (!isRecord(parsed) || !isRecord(parsed.database)) {
		return undefined;
	}
	const dataDir = parsed.database.embeddedPostgresDataDir;
	const port = parseOptionalPort(parsed.database.embeddedPostgresPort);
	const dbPath =
		typeof dataDir === "string" ? normalizeOptionalValue(dataDir) : undefined;
	return dbPath || port ? { dbPath, port } : undefined;
}

function instanceConfigPath(env: NodeJS.ProcessEnv): string {
	const home = normalizeOptionalValue(env.HOME) ?? os.homedir();
	return path.join(home, ".devos", "config", INSTANCE_CONFIG_FILE);
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function parseOptionalPort(value: unknown): number | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value <= 0 ||
		value > 65_535
	) {
		throw new Error(
			`${INSTANCE_CONFIG_FILE} database.embeddedPostgresPort must be a positive integer port`,
		);
	}
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
