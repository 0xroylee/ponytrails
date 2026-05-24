import { lstat, readFile, symlink } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const requireFromHere = createRequire(import.meta.url);

interface SymlinkEntry {
	source: string;
	target: string;
}

export async function hydrateEmbeddedPostgresNativeSymlinks(): Promise<void> {
	const packageName = platformPackageName();
	if (!packageName) {
		return;
	}

	let packageJsonPath: string;
	try {
		packageJsonPath = requireFromHere.resolve(`${packageName}/package.json`);
	} catch {
		return;
	}

	const packageDir = path.dirname(packageJsonPath);
	const symlinks = await readSymlinks(packageDir);
	for (const entry of symlinks) {
		await ensureSymlink(packageDir, entry);
	}
}

async function readSymlinks(packageDir: string): Promise<SymlinkEntry[]> {
	try {
		const raw = await readFile(
			path.join(packageDir, "native", "pg-symlinks.json"),
			"utf8",
		);
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed) ? parsed.filter(isSymlinkEntry) : [];
	} catch {
		return [];
	}
}

async function ensureSymlink(
	packageDir: string,
	entry: SymlinkEntry,
): Promise<void> {
	const sourcePath = path.join(packageDir, entry.source);
	const targetPath = path.join(packageDir, entry.target);
	if (await pathExists(targetPath)) {
		return;
	}

	const relativeSource = path.relative(path.dirname(targetPath), sourcePath);
	try {
		await symlink(relativeSource, targetPath);
	} catch {
		// If the package is installed read-only, startup will surface the real
		// loader error. This helper is best-effort install/runtime repair.
	}
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await lstat(targetPath);
		return true;
	} catch {
		return false;
	}
}

function isSymlinkEntry(value: unknown): value is SymlinkEntry {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as SymlinkEntry).source === "string" &&
		typeof (value as SymlinkEntry).target === "string"
	);
}

function platformPackageName(): string | undefined {
	const platform = os.platform();
	const arch = os.arch();
	if (platform === "darwin" && arch === "arm64") {
		return "@embedded-postgres/darwin-arm64";
	}
	if (platform === "darwin" && arch === "x64") {
		return "@embedded-postgres/darwin-x64";
	}
	if (platform === "linux" && arch === "x64") {
		return "@embedded-postgres/linux-x64";
	}
	if (platform === "linux" && arch === "arm64") {
		return "@embedded-postgres/linux-arm64";
	}
	if (platform === "linux" && arch === "arm") {
		return "@embedded-postgres/linux-arm";
	}
	if (platform === "linux" && arch === "ia32") {
		return "@embedded-postgres/linux-ia32";
	}
	if (platform === "linux" && arch === "ppc64") {
		return "@embedded-postgres/linux-ppc64";
	}
	if (platform === "win32" && arch === "x64") {
		return "@embedded-postgres/windows-x64";
	}
	return undefined;
}
