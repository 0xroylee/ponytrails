import { describe, expect, it } from "bun:test";
import { buildDaemonCommands } from "../src/features/daemon";
import { buildAttachedPollerEnv } from "../src/features/daemon/daemon-poller";

describe("daemon workspace environment", () => {
	it("adds daemon cwd as PIV_WORKSPACE_PATH for production children", () => {
		const commands = buildDaemonCommands({}, "/repo");

		expect(commands.map((command) => command.env.PIV_WORKSPACE_PATH)).toEqual([
			"/repo",
			"/repo",
			"/repo",
		]);
	});

	it("preserves explicit PIV_WORKSPACE_PATH for production children", () => {
		const commands = buildDaemonCommands(
			{ PIV_WORKSPACE_PATH: "/workspace" },
			"/repo",
		);

		expect(commands.map((command) => command.env.PIV_WORKSPACE_PATH)).toEqual([
			"/workspace",
			"/workspace",
			"/workspace",
		]);
	});

	it("adds daemon cwd to attached poller env when unset", () => {
		expect(buildAttachedPollerEnv({}, "/repo").PIV_WORKSPACE_PATH).toBe(
			"/repo",
		);
	});
});
