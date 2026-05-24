import { describe, expect, it } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("CLI build script", () => {
	it("cleans stale assets and leaves database runtimes out of the bundle", async () => {
		const outdir = await mkdtemp(path.join(os.tmpdir(), "devos-build-"));

		try {
			await writeFile(path.join(outdir, "pglite.wasm"), "stale");
			await writeFile(path.join(outdir, "pglite.data"), "stale");
			await mkdir(path.join(outdir, "migrations"), { recursive: true });
			await writeFile(path.join(outdir, "migrations", "stale.sql"), "stale");

			await runBuild(outdir);

			const outputFiles = await readdir(outdir);
			expect(outputFiles).toContain("index.js");
			expect(outputFiles).not.toContain("pglite.wasm");
			expect(outputFiles).not.toContain("pglite.data");
			expect(outputFiles).not.toContain("migrations");

			const bundle = await readFile(path.join(outdir, "index.js"), "utf8");
			expect(bundle).not.toMatch(
				/from\s+["'](?:pg|devos-db|devos-server(?:\/[^"']*)?|embedded-postgres|@embedded-postgres\/[^"']+)["']/,
			);
			expect(bundle).not.toMatch(
				/import\s*\(\s*["'](?:pg|devos-db|devos-server(?:\/[^"']*)?|embedded-postgres|@embedded-postgres\/[^"']+)["']\s*\)/,
			);
			expect(bundle).not.toMatch(
				/require\(\s*["'](?:pg|devos-db|devos-server(?:\/[^"']*)?|embedded-postgres|@embedded-postgres\/[^"']+)["']\s*\)/,
			);
		} finally {
			await rm(outdir, { recursive: true, force: true });
		}
	});
});

async function runBuild(outdir: string): Promise<void> {
	const packageRoot = path.resolve(import.meta.dir, "..");
	const workspaceRoot = path.resolve(packageRoot, "../..");
	const subprocess = Bun.spawn({
		cmd: [
			process.execPath,
			path.join(packageRoot, "scripts/build.ts"),
			"--outdir",
			outdir,
		],
		cwd: workspaceRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		subprocess.exited,
		new Response(subprocess.stdout).text(),
		new Response(subprocess.stderr).text(),
	]);
	if (exitCode !== 0) {
		throw new Error(`Build failed:\n${stdout}\n${stderr}`);
	}
}
