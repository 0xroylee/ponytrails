import { describe, expect, it } from "bun:test";
import path from "node:path";
import {
	resolveDefaultServerWorkspacePath,
	resolveServerDatabasePath,
	resolveServerWorkspacePath,
} from "../src/startup-paths";
import type { ServerStartupConfig } from "../src/startup-paths.types";

describe("server startup paths", () => {
	it("resolves the default workspace path to the repo root", () => {
		expect(resolveDefaultServerWorkspacePath()).toBe(
			path.resolve(import.meta.dir, "..", "..", ".."),
		);
	});

	it("uses PIV_WORKSPACE_PATH as the config root when provided", () => {
		const workspacePath = path.join("/tmp", "workspace");

		expect(
			resolveServerWorkspacePath(
				{ PIV_WORKSPACE_PATH: workspacePath },
				path.join("/tmp", "fallback"),
			),
		).toBe(workspacePath);
	});

	it("keeps repo-root database resolution when launched from a package cwd", () => {
		const workspacePath = path.join("/tmp", "repo");
		const packageCwd = path.join(workspacePath, "packages", "server");
		const databasePath = path.join(
			workspacePath,
			".devos",
			"config",
			"server-db",
		);
		const resolvedWorkspacePath = resolveServerWorkspacePath(
			{ PIV_WORKSPACE_PATH: workspacePath },
			packageCwd,
		);

		expect(resolvedWorkspacePath).toBe(workspacePath);
		expect(
			resolveServerDatabasePath(
				{},
				resolvedWorkspacePath,
				createConfig(databasePath, []),
			),
		).toBe(databasePath);
	});

	it("uses the resolved default project database path without env override", () => {
		const databasePath = path.join("/tmp", "workspace", ".devos", "server-db");

		expect(
			resolveServerDatabasePath(
				{},
				"/tmp/workspace",
				createConfig(databasePath),
			),
		).toBe(databasePath);
	});

	it("uses the root server database path when projects are empty", () => {
		const databasePath = path.join("/tmp", "workspace", ".devos", "server-db");

		expect(
			resolveServerDatabasePath(
				{},
				"/tmp/workspace",
				createConfig(databasePath, []),
			),
		).toBe(databasePath);
	});

	it("resolves PIV_SERVER_DATABASE_PATH relative to the workspace path", () => {
		const workspacePath = path.join("/tmp", "workspace");

		expect(
			resolveServerDatabasePath(
				{ PIV_SERVER_DATABASE_PATH: "override/server-db" },
				workspacePath,
				createConfig(path.join(workspacePath, ".devos", "server-db")),
			),
		).toBe(path.join(workspacePath, "override", "server-db"));
	});
});

function createConfig(
	databasePath: string,
	projects: unknown[] = [{ server: { database: { databasePath } } }],
): ServerStartupConfig {
	return {
		projects,
		server: { database: { databasePath } },
	} as ServerStartupConfig;
}
