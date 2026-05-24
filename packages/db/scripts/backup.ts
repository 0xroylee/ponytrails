import { cp, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { printCliError, readOptionValue, resolveDatabasePath } from "./cli";

export interface BackupDatabaseOptions {
	dbPath?: string;
	now?: Date;
	outPath?: string;
}

export interface BackupDatabaseResult {
	backupPath: string;
	sourcePath: string;
}

interface ParsedBackupArgs {
	dbPath?: string;
	help: boolean;
	outPath?: string;
}

if (import.meta.main) {
	try {
		const result = await runBackupDatabaseCli(process.argv.slice(2));
		if (result) {
			console.log(`Backed up ${result.sourcePath}`);
			console.log(`Backup written to ${result.backupPath}`);
		}
	} catch (error) {
		printCliError(error);
	}
}

export async function runBackupDatabaseCli(
	rawArgs: string[],
): Promise<BackupDatabaseResult | undefined> {
	const args = parseBackupArgs(rawArgs);
	if (args.help) {
		printHelp();
		return undefined;
	}
	return backupDatabase({
		dbPath: args.dbPath,
		outPath: args.outPath,
	});
}

export async function backupDatabase(
	options: BackupDatabaseOptions = {},
): Promise<BackupDatabaseResult> {
	const sourcePath = await resolveDatabasePath(options.dbPath);
	await ensureDirectory(sourcePath, "Database path");
	await ensureClusterIsStopped(sourcePath);
	const backupPath = options.outPath
		? path.resolve(options.outPath)
		: await createBackupPath(sourcePath, options.now);
	if (backupPath === sourcePath) {
		throw new Error("Backup path must differ from database path");
	}
	if (await pathExists(backupPath)) {
		throw new Error(`Backup path already exists: ${backupPath}`);
	}
	await cp(sourcePath, backupPath, { recursive: true });
	return { backupPath, sourcePath };
}

async function ensureClusterIsStopped(sourcePath: string): Promise<void> {
	const pidPath = path.join(sourcePath, "postmaster.pid");
	let pid: number | undefined;
	try {
		const content = await readFile(pidPath, "utf8");
		pid = Number(content.split(/\r?\n/, 1)[0]);
	} catch {
		return;
	}
	if (!pid || !Number.isInteger(pid)) {
		return;
	}
	if (isProcessAlive(pid)) {
		throw new Error(
			`Refusing to back up live embedded PostgreSQL cluster at ${sourcePath}; stop the server first`,
		);
	}
}

function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return !isMissingProcessError(error);
	}
}

function isMissingProcessError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === "ESRCH"
	);
}

function parseBackupArgs(rawArgs: string[]): ParsedBackupArgs {
	const parsed: ParsedBackupArgs = { help: false };
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
		if (arg === "--out") {
			parsed.outPath = readOptionValue(rawArgs, index, arg);
			index += 1;
			continue;
		}
		throw new Error(`Unknown option: ${arg}`);
	}
	return parsed;
}

async function createBackupPath(
	sourcePath: string,
	now = new Date(),
): Promise<string> {
	const parent = path.dirname(sourcePath);
	const baseName = path.basename(sourcePath);
	const timestamp = now.toISOString().replace(/[-:.]/g, "");
	for (let index = 0; index < 100; index += 1) {
		const suffix = index === 0 ? "" : `-${index}`;
		const candidate = path.join(
			parent,
			`${baseName}.backup-${timestamp}${suffix}`,
		);
		if (!(await pathExists(candidate))) {
			return candidate;
		}
	}
	throw new Error(`Unable to create unique backup path for ${sourcePath}`);
}

async function ensureDirectory(
	directoryPath: string,
	label: string,
): Promise<void> {
	const stats = await stat(directoryPath);
	if (!stats.isDirectory()) {
		throw new Error(`${label} is not a directory: ${directoryPath}`);
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

function printHelp(): void {
	console.log(`Copy a stopped devos-db embedded PostgreSQL cluster to a timestamped backup.

Usage:
  bun run --filter devos-db backup -- [--db PATH] [--out PATH]

Options:
  --db <path>   Embedded PostgreSQL data directory
  --out <path>  Backup destination path
  --help, -h    Show this help`);
}
