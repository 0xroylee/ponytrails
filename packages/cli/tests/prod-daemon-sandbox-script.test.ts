import { describe, expect, it } from "bun:test";
import {
	buildProdDaemonSandbox,
	parseProdDaemonSandboxArgs,
	runProdDaemonSandbox,
} from "../../../scripts/prod-daemon-sandbox";
import type { ProdDaemonSandboxCommand } from "../../../scripts/types/prod-daemon-sandbox.types";

describe("production daemon sandbox script", () => {
	it("builds isolated default paths, ports, urls, and env", () => {
		const sandbox = buildProdDaemonSandbox({ cwd: "/repo", env: {} });

		expect(sandbox.root).toBe("/repo/.devos/sandboxes/production-daemon");
		expect(sandbox.home).toBe("/repo/.devos/sandboxes/production-daemon/home");
		expect(sandbox.instanceConfigPath).toBe(
			"/repo/.devos/sandboxes/production-daemon/home/.devos/config/instance.config.json",
		);
		expect(sandbox.serverBaseUrl).toBe("http://127.0.0.1:3101");
		expect(sandbox.webUrl).toBe("http://127.0.0.1:3100");
		expect(sandbox.workflowWsUrl).toBe("ws://127.0.0.1:3101/api/workflow");
		expect(sandbox.env.HOME).toBe(sandbox.home);
		expect(sandbox.env.CODEX_HOME).toBe(`${sandbox.root}/codex-home`);
		expect(sandbox.env.PIV_WORKSPACE_PATH).toBe(`${sandbox.root}/workspace`);
		expect(sandbox.env.PIV_EXECUTION_PATH).toBe(`${sandbox.root}/workspace`);
		expect(sandbox.env.PIV_SERVER_DATABASE_PATH).toBe(
			`${sandbox.root}/server-db`,
		);
		expect(sandbox.env.PIV_SERVER_PORT).toBe("3101");
		expect(sandbox.env.PORT).toBe("3100");
		expect(sandbox.env.DEVOS_SERVER_BASE_URL).toBe("http://127.0.0.1:3101");
		expect(sandbox.env.DEVOS_WORKFLOW_WS_URL).toBe(
			"ws://127.0.0.1:3101/api/workflow",
		);
		expect(sandbox.env.PIV_DRY_RUN).toBe("1");
	});

	it("parses explicit ports and skip-build", () => {
		const options = parseProdDaemonSandboxArgs([
			"--server-port",
			"4101",
			"--web-port",
			"4100",
			"--db-port",
			"55430",
			"--skip-build",
		]);

		expect(options).toEqual({
			dbPort: "55430",
			serverPort: "4101",
			skipBuild: true,
			webPort: "4100",
		});
	});

	it("rejects conflicting ports", () => {
		expect(() =>
			buildProdDaemonSandbox({
				cwd: "/repo",
				env: {},
				serverPort: "4101",
				webPort: "4101",
			}),
		).toThrow("Sandbox port conflict");
	});

	it("runs build before the built daemon", async () => {
		const harness = createRunHarness();

		await expect(
			runProdDaemonSandbox({
				cwd: "/repo",
				env: {},
				runCommand: harness.runCommand,
				mkdir: harness.mkdir,
				writeFile: harness.writeFile,
				write: harness.write,
			}),
		).resolves.toBe(0);

		expect(harness.commands.map((command) => command.args)).toEqual([
			["run", "build"],
			["packages/cli/dist/index.js", "daemon"],
		]);
		expect(harness.commands[1]?.env.HOME).toBe(
			"/repo/.devos/sandboxes/production-daemon/home",
		);
		expect(harness.writes[0]?.path).toBe(
			"/repo/.devos/sandboxes/production-daemon/home/.devos/config/instance.config.json",
		);
		expect(harness.output.join("")).toContain("Server health");
	});

	it("skips build when requested", async () => {
		const harness = createRunHarness();

		await runProdDaemonSandbox({
			cwd: "/repo",
			env: {},
			args: ["--skip-build"],
			runCommand: harness.runCommand,
			mkdir: harness.mkdir,
			writeFile: harness.writeFile,
			write: harness.write,
		});

		expect(harness.commands.map((command) => command.args)).toEqual([
			["packages/cli/dist/index.js", "daemon"],
		]);
	});
});

function createRunHarness(): {
	commands: ProdDaemonSandboxCommand[];
	mkdir: (targetPath: string) => Promise<void>;
	output: string[];
	runCommand: (command: ProdDaemonSandboxCommand) => Promise<number>;
	write: (message: string) => void;
	writeFile: (targetPath: string, content: string) => Promise<void>;
	writes: Array<{ path: string; content: string }>;
} {
	const commands: ProdDaemonSandboxCommand[] = [];
	const output: string[] = [];
	const writes: Array<{ path: string; content: string }> = [];
	return {
		commands,
		output,
		writes,
		mkdir: async () => {},
		runCommand: async (command) => {
			commands.push(command);
			return 0;
		},
		write: (message) => output.push(message),
		writeFile: async (targetPath, content) => {
			writes.push({ path: targetPath, content });
		},
	};
}
