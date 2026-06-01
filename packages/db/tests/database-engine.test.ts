import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveServerDatabaseEngine } from "../src";

describe("server database engine resolution", () => {
	it("keeps existing embedded PostgreSQL clusters on embedded-postgres in sandboxed environments", async () => {
		const tempDir = await mkdtempDir();
		const databasePath = path.join(tempDir, "db");

		try {
			await mkdir(databasePath, { recursive: true });
			await writeFile(path.join(databasePath, "PG_VERSION"), "15\n");

			await expect(
				resolveServerDatabaseEngine(
					databasePath,
					{},
					{ CODEX_SANDBOX_NETWORK_DISABLED: "1" },
					async () => true,
				),
			).resolves.toBe("embedded-postgres");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});

async function mkdtempDir(): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), "devos-db-engine-"));
}
