import { spawn } from "node:child_process";
import { formatCliDaemonWsUrl, startCliCommandDaemon } from "./command-daemon";
import {
	renderCliOnlyDaemonStartup,
	renderProductionDaemonStartup,
} from "./daemon-output";
import {
	buildWorkflowPollerInvocation,
	startAttachedWorkflowPoller,
	superviseCliCommandDaemonWithPoller,
} from "./daemon-poller";
import { resolveDaemonPorts } from "./daemon-ports";
import { scheduleDaemonReadyMessage } from "./daemon-readiness";
import {
	resolveServerBaseUrl,
	resolveServerEventsWsUrl,
	resolveWebUrl,
	resolveWorkflowWsUrl,
} from "./daemon-urls";
import { resolveDaemonWorkspaceEnv } from "./daemon-workspace-env";
import type {
	DaemonChild,
	DaemonReadinessHandle,
	DaemonServiceCommand,
	DaemonSignalTarget,
	DaemonSpawn,
	RunCliCommandDaemonOnlyOptions,
	RunProductionDaemonOptions,
} from "./daemon.types";

const SIGNALS = ["SIGINT", "SIGTERM"] as const;

export function buildDaemonCommands(
	env: NodeJS.ProcessEnv = process.env,
	cwd?: string,
): DaemonServiceCommand[] {
	const { serverPort, webPort, cliDaemonPort } = resolveDaemonPorts(env);
	const cliDaemonWsUrl =
		env.DEVOS_CLI_DAEMON_WS_URL ?? formatCliDaemonWsUrl(cliDaemonPort);
	const serverBaseUrl = resolveServerBaseUrl(env);
	const serverEventsWsUrl =
		env.DEVOS_SERVER_EVENTS_WS_URL ?? resolveServerEventsWsUrl(serverBaseUrl);
	const workflowWsUrl =
		env.DEVOS_WORKFLOW_WS_URL ?? resolveWorkflowWsUrl(serverBaseUrl);
	const serverWsUrl =
		env.NEXT_PUBLIC_DEVOS_SERVER_WS_URL ??
		`ws://127.0.0.1:${serverPort}/api/cli/stream`;
	const workspaceEnv = resolveDaemonWorkspaceEnv(env, cwd);
	const baseEnv = { ...workspaceEnv, NODE_ENV: "production" };
	const pollerInvocation = buildWorkflowPollerInvocation();

	return [
		{
			name: "server",
			command: "bun",
			args: ["run", "--filter", "devos-server", "start"],
			env: {
				...baseEnv,
				PIV_SERVER_PORT: serverPort,
				DEVOS_CLI_DAEMON_WS_URL: cliDaemonWsUrl,
			},
		},
		{
			name: "web",
			command: "bun",
			args: ["run", "--filter", "web", "start"],
			env: {
				...baseEnv,
				PORT: webPort,
				DEVOS_SERVER_BASE_URL: serverBaseUrl,
				NEXT_PUBLIC_DEVOS_SERVER_WS_URL: serverWsUrl,
			},
		},
		{
			name: "workflow-poller",
			command: pollerInvocation.command,
			args: pollerInvocation.args,
			env: {
				...baseEnv,
				DEVOS_SERVER_BASE_URL: serverBaseUrl,
				DEVOS_SERVER_EVENTS_WS_URL: serverEventsWsUrl,
				DEVOS_WORKFLOW_WS_URL: workflowWsUrl,
			},
		},
	];
}

export async function runProductionDaemon(
	options: RunProductionDaemonOptions = {},
): Promise<number> {
	const cwd = options.cwd ?? process.cwd();
	const spawnChild = options.spawnChild ?? spawnDaemonChild;
	const signalTarget = options.signalTarget ?? process;
	const env = options.env ?? process.env;
	const serverBaseUrl = resolveServerBaseUrl(env);
	const write = options.write ?? process.stdout.write.bind(process.stdout);
	const workspaceEnv = resolveDaemonWorkspaceEnv(env, cwd);
	const services = buildDaemonCommands(env, cwd);
	const commandDaemon = (options.startCommandDaemon ?? startCliCommandDaemon)({
		cwd,
		env: {
			...workspaceEnv,
			DEVOS_SERVER_BASE_URL: serverBaseUrl,
			DEVOS_SERVER_EVENTS_WS_URL:
				env.DEVOS_SERVER_EVENTS_WS_URL ??
				resolveServerEventsWsUrl(serverBaseUrl),
			DEVOS_WORKFLOW_WS_URL:
				env.DEVOS_WORKFLOW_WS_URL ?? resolveWorkflowWsUrl(serverBaseUrl),
		},
	});
	write(
		renderProductionDaemonStartup({
			cliDaemonUrl: formatCliDaemonWsUrl(commandDaemon.port),
			serverBaseUrl,
			webUrl: resolveWebUrl(env),
			workflowUrl:
				env.DEVOS_WORKFLOW_WS_URL ?? resolveWorkflowWsUrl(serverBaseUrl),
		}),
	);
	const children = services.map((service) =>
		spawnChild(service.command, service.args, {
			cwd,
			env: service.env,
			stdio: "inherit",
		}),
	);
	const ready = scheduleDaemonReadyMessage({
		scheduler: options.readinessScheduler,
		write,
	});

	return superviseDaemonChildren(children, signalTarget, commandDaemon, ready);
}

export function runCliCommandDaemonOnly(
	options: RunCliCommandDaemonOnlyOptions = {},
): Promise<number> {
	const cwd = options.cwd ?? process.cwd();
	const signalTarget = options.signalTarget ?? process;
	const commandDaemon = (options.startCommandDaemon ?? startCliCommandDaemon)({
		cwd,
		env: options.env,
	});
	const write = options.write ?? process.stdout.write.bind(process.stdout);
	const readiness = scheduleDaemonReadyMessage({
		scheduler: options.readinessScheduler,
		write,
	});
	const pollerAttached =
		options.pollForever === true && options.allProjects === true;
	write(
		renderCliOnlyDaemonStartup({
			cliDaemonUrl: formatCliDaemonWsUrl(commandDaemon.port),
			pollerAttached,
		}),
	);
	const poller = pollerAttached
		? startAttachedWorkflowPoller({
				cwd,
				env: options.env,
				write,
				spawnPoller: options.spawnPoller,
			})
		: undefined;

	return superviseCliCommandDaemonWithPoller(
		commandDaemon,
		signalTarget,
		poller,
		readiness,
	);
}

function superviseDaemonChildren(
	children: DaemonChild[],
	signalTarget: DaemonSignalTarget,
	commandDaemon: { stop(): Promise<void> },
	readiness?: DaemonReadinessHandle,
): Promise<number> {
	return new Promise((resolve) => {
		let resolved = false;
		let isShuttingDown = false;

		const finish = (code: number) => {
			if (resolved) {
				return;
			}
			resolved = true;
			readiness?.cancel();
			for (const signal of SIGNALS) {
				signalTarget.off(signal, signalHandlers[signal]);
			}
			void commandDaemon.stop();
			resolve(code);
		};

		const shutdown = (
			signal: NodeJS.Signals = "SIGTERM",
			excludedChild?: DaemonChild,
		) => {
			if (isShuttingDown) {
				return;
			}
			isShuttingDown = true;
			for (const child of children) {
				if (child !== excludedChild && !child.killed) {
					child.kill(signal);
				}
			}
		};

		const signalHandlers = {
			SIGINT: () => {
				shutdown("SIGINT");
				finish(0);
			},
			SIGTERM: () => {
				shutdown("SIGTERM");
				finish(0);
			},
		};

		for (const signal of SIGNALS) {
			signalTarget.on(signal, signalHandlers[signal]);
		}

		for (const child of children) {
			child.on("error", () => {
				shutdown("SIGTERM", child);
				finish(1);
			});
			child.on("close", (code, signal) => {
				if (resolved) {
					return;
				}
				shutdown(signal ?? undefined, child);
				finish(code ?? (signal ? 1 : 0));
			});
		}
	});
}

const spawnDaemonChild: DaemonSpawn = (command, args, options) =>
	spawn(command, args, options);
