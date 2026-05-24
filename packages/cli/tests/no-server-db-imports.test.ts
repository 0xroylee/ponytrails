import { describe, expect, it } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

describe("CLI server DB boundary", () => {
	it("does not import server database runtime packages from production CLI source", async () => {
		const files = await listTypeScriptFiles(
			path.resolve(import.meta.dir, "../src"),
		);
		const offenders: string[] = [];
		for (const file of files) {
			const source = await readFile(file, "utf8");
			for (const importedPackage of findRuntimeImports(source)) {
				if (isServerDatabasePackage(importedPackage)) {
					offenders.push(
						`${path.relative(process.cwd(), file)} imports ${importedPackage}`,
					);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("does not declare server database runtime packages as CLI dependencies", async () => {
		const packageJsonPath = path.resolve(import.meta.dir, "../package.json");
		const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
			dependencies?: Record<string, string>;
			optionalDependencies?: Record<string, string>;
			peerDependencies?: Record<string, string>;
		};
		const runtimeDependencies = {
			...packageJson.dependencies,
			...packageJson.optionalDependencies,
			...packageJson.peerDependencies,
		};

		expect(runtimeDependencies).not.toHaveProperty("devos-db");
		expect(runtimeDependencies).not.toHaveProperty("devos-server");
		expect(runtimeDependencies).not.toHaveProperty("embedded-postgres");
	});
});

function findRuntimeImports(source: string): string[] {
	return [
		...source.matchAll(
			/\b(?:import|export)\s+(?:type\s+)?[^"']*?\s+from\s+["']([^"']+)["']/g,
		),
		...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
	].flatMap((match) => (match[1] ? [match[1]] : []));
}

function isServerDatabasePackage(packageName: string): boolean {
	return (
		packageName === "devos-db" ||
		packageName === "devos-server" ||
		packageName.startsWith("devos-server/") ||
		packageName === "embedded-postgres" ||
		packageName.startsWith("@embedded-postgres/")
	);
}

async function listTypeScriptFiles(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(root, entry.name);
			if (entry.isDirectory()) {
				return listTypeScriptFiles(entryPath);
			}
			return entry.name.endsWith(".ts") ? [entryPath] : [];
		}),
	);
	return nested.flat();
}
