import { readFile } from "node:fs/promises";
import { normalizeOptionalValue } from "./env-normalizers";
import { instanceConfigPath } from "./home-paths";

const DEFAULT_EMBEDDED_POSTGRES_PORT = 54329;

export interface InstanceServerDatabaseConfig {
	databasePath?: string;
	port: number;
}

export async function loadInstanceServerDatabasePath(
	readText: (
		targetPath: string,
		encoding: BufferEncoding,
	) => Promise<string> = readFile,
): Promise<string | undefined> {
	return (await loadInstanceServerDatabaseConfig(readText)).databasePath;
}

export async function loadInstanceServerDatabaseConfig(
	readText: (
		targetPath: string,
		encoding: BufferEncoding,
	) => Promise<string> = readFile,
): Promise<InstanceServerDatabaseConfig> {
	let content: string;
	try {
		content = await readText(instanceConfigPath(), "utf8");
	} catch {
		return { port: DEFAULT_EMBEDDED_POSTGRES_PORT };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return { port: DEFAULT_EMBEDDED_POSTGRES_PORT };
	}

	if (!isRecord(parsed) || !isRecord(parsed.database)) {
		return { port: DEFAULT_EMBEDDED_POSTGRES_PORT };
	}

	const dataDir = parsed.database.embeddedPostgresDataDir;
	return {
		databasePath:
			typeof dataDir === "string" ? normalizeOptionalValue(dataDir) : undefined,
		port: parsePort(parsed.database.embeddedPostgresPort),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parsePort(value: unknown): number {
	if (value === undefined || value === null) {
		return DEFAULT_EMBEDDED_POSTGRES_PORT;
	}
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value <= 0 ||
		value > 65_535
	) {
		throw new Error(
			"instance.config.json database.embeddedPostgresPort must be a positive integer port",
		);
	}
	return value;
}
