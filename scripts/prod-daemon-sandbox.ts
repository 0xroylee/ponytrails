import { spawn } from "node:child_process";
import { mkdir as fsMkdir, writeFile as fsWriteFile } from "node:fs/promises";
import path from "node:path";
import { buildSandboxInstanceConfig } from "./prod-daemon-sandbox-config";
import type {
	ProdDaemonSandbox,
	ProdDaemonSandboxCommand,
	ProdDaemonSandboxOptions,
	RunProdDaemonSandboxOptions,
} from "./types/prod-daemon-sandbox.types";

const DEFAULT_SERVER_PORT = "3101";
const DEFAULT_WEB_PORT = "3100";
const DEFAULT_DB_PORT = "55429";

export function parseProdDaemonSandboxArgs(
	args: string[],
): ProdDaemonSandboxOptions {
	const options: ProdDaemonSandboxOptions = {};
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--skip-build") {
			options.skipBuild = true;
			continue;
		}
		if (
			arg === "--server-port" ||
			arg === "--web-port" ||
			arg === "--db-port"
		) {
			const value = args[index + 1];
			if (!value) throw new Error(`${arg} requires a value`);
			if (arg === "--server-port") options.serverPort = value;
			if (arg === "--web-port") options.webPort = value;
			if (arg === "--db-port") options.dbPort = value;
			index += 1;
			continue;
		}
		throw new Error(`Unknown sandbox daemon option: ${arg ?? ""}`);
	}
	return options;
}

export function buildProdDaemonSandbox(
	options: ProdDaemonSandboxOptions = {},
): ProdDaemonSandbox {
	const cwd = options.cwd ?? process.cwd();
	const env = options.env ?? process.env;
	const serverPort = parsePort(
		options.serverPort ?? DEFAULT_SERVER_PORT,
		"--server-port",
	);
	const webPort = parsePort(options.webPort ?? DEFAULT_WEB_PORT, "--web-port");
	const dbPort = parsePort(options.dbPort ?? DEFAULT_DB_PORT, "--db-port");
	assertDistinctPorts([
		["server", serverPort],
		["web", webPort],
		["database", dbPort],
	]);

	const root = path.join(cwd, ".devos", "sandboxes", "production-daemon");
	const home = path.join(root, "home");
	const workspace = path.join(root, "workspace");
	const codexHome = path.join(root, "codex-home");
	const serverDb = path.join(root, "server-db");
	const serverBaseUrl = `http://127.0.0.1:${serverPort}`;
	const workflowWsUrl = `ws://127.0.0.1:${serverPort}/api/workflow`;
	const webUrl = `http://127.0.0.1:${webPort}`;
	const instanceConfig = buildSandboxInstanceConfig({
		dbPort,
		root,
		serverPort,
	});

	return {
		dbPort,
		env: {
			...env,
			CODEX_HOME: env.CODEX_HOME ?? codexHome,
			DEVOS_SERVER_BASE_URL: serverBaseUrl,
			DEVOS_WORKFLOW_WS_URL: workflowWsUrl,
			HOME: home,
			NEXT_PUBLIC_DEVOS_WORKFLOW_WS_URL: workflowWsUrl,
			PIV_DRY_RUN: env.PIV_DRY_RUN ?? "1",
			PIV_EXECUTION_PATH: workspace,
			PIV_SERVER_DATABASE_PATH: serverDb,
			PIV_SERVER_PORT: serverPort,
			PIV_WORKSPACE_PATH: workspace,
			PORT: webPort,
		},
		home,
		instanceConfig,
		instanceConfigPath: path.join(
			home,
			".devos",
			"config",
			"instance.config.json",
		),
		root,
		serverBaseUrl,
		serverPort,
		webPort,
		webUrl,
		workflowWsUrl,
	};
}

export async function runProdDaemonSandbox(
	options: RunProdDaemonSandboxOptions = {},
): Promise<number> {
	const parsed = parseProdDaemonSandboxArgs(
		options.args ?? process.argv.slice(2),
	);
	const sandbox = buildProdDaemonSandbox({ ...options, ...parsed });
	const mkdir =
		options.mkdir ?? ((targetPath) => fsMkdir(targetPath, { recursive: true }));
	const writeFile = options.writeFile ?? fsWriteFile;
	const runCommand = options.runCommand ?? spawnCommand;
	const write = options.write ?? ((message) => process.stderr.write(message));

	await Promise.all([
		mkdir(path.dirname(sandbox.instanceConfigPath)),
		mkdir(path.join(sandbox.root, "workspace")),
		mkdir(path.join(sandbox.root, "codex-home")),
		mkdir(path.join(sandbox.root, "server-db")),
		mkdir(path.join(sandbox.root, "logs")),
		mkdir(path.join(sandbox.root, "storage")),
		mkdir(path.join(sandbox.root, "backups")),
		mkdir(path.join(sandbox.root, "secrets")),
	]);
	await writeFile(
		sandbox.instanceConfigPath,
		`${JSON.stringify(sandbox.instanceConfig, null, "\t")}\n`,
	);
	write(renderSandboxSummary(sandbox, Boolean(parsed.skipBuild)));

	if (!parsed.skipBuild) {
		const buildCode = await runCommand({
			args: ["run", "build"],
			command: "bun",
			cwd: options.cwd ?? process.cwd(),
			env: sandbox.env,
			stdio: "inherit",
		});
		if (buildCode !== 0) return buildCode;
	}

	return runCommand({
		args: ["packages/cli/dist/index.js", "daemon"],
		command: "bun",
		cwd: options.cwd ?? process.cwd(),
		env: sandbox.env,
		stdio: "inherit",
	});
}

function parsePort(rawPort: string, name: string): string {
	const port = Number(rawPort);
	if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
		throw new Error(`${name} must be a valid TCP port`);
	}
	return String(port);
}

function assertDistinctPorts(assignments: Array<[string, string]>): void {
	const seen = new Map<string, string>();
	for (const [name, port] of assignments) {
		const existing = seen.get(port);
		if (existing) {
			throw new Error(
				`Sandbox port conflict: ${existing} and ${name} both use ${port}`,
			);
		}
		seen.set(port, name);
	}
}

function renderSandboxSummary(
	sandbox: ProdDaemonSandbox,
	skipBuild: boolean,
): string {
	return [
		"Starting production daemon sandbox",
		`Sandbox root: ${sandbox.root}`,
		`Sandbox HOME: ${sandbox.home}`,
		`Server health: ${new URL("/health", sandbox.serverBaseUrl).toString()}`,
		`Web UI: ${sandbox.webUrl}`,
		`Build: ${skipBuild ? "skipped" : "enabled"}`,
		"",
	].join("\n");
}

function spawnCommand(command: ProdDaemonSandboxCommand): Promise<number> {
	const child = spawn(command.command, command.args, {
		cwd: command.cwd,
		env: command.env,
		stdio: command.stdio,
	});
	return new Promise((resolve) => {
		child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
		child.on("error", () => resolve(1));
	});
}

if (import.meta.main) {
	process.exitCode = await runProdDaemonSandbox();
}
