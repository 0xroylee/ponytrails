import { spawn } from "node:child_process";
import { buildWorkflowPollerInvocation } from "./daemon-poller";
import { cleanupDaemonPorts } from "./daemon-port-cleanup";
import { resolveDaemonPorts } from "./daemon-ports";
import { scheduleDaemonReadyMessage } from "./daemon-readiness";
import { resolveWorkflowWsUrl } from "./daemon-urls";
import { resolveDaemonWorkspaceEnv } from "./daemon-workspace-env";
import type {
	DaemonChild,
	DaemonPortCleanup,
	DaemonPortCleanupPorts,
	DaemonReadinessHandle,
	DaemonServiceCommand,
	DaemonSignalTarget,
	DaemonSpawn,
	RunProductionDaemonOptions,
} from "./daemon.types";
import { startWorkflowCommandWorker } from "./workflow-command-worker";

const SIGNALS = ["SIGINT", "SIGTERM"] as const;

export function buildDaemonCommands(
	env: NodeJS.ProcessEnv = process.env,
	cwd?: string,
): DaemonServiceCommand[] {
	return buildDaemonCommandsForPorts(env, resolveDaemonPorts(env), cwd);
}

function buildDaemonCommandsForPorts(
	env: NodeJS.ProcessEnv,
	ports: DaemonPortCleanupPorts,
	cwd?: string,
): DaemonServiceCommand[] {
	const serverBaseUrl =
		env.DEVOS_SERVER_BASE_URL ?? `http://127.0.0.1:${ports.serverPort}`;
	const workflowWsUrl =
		env.DEVOS_WORKFLOW_WS_URL ?? resolveWorkflowWsUrl(serverBaseUrl);
	const baseEnv = {
		...resolveDaemonWorkspaceEnv(env, cwd),
		NODE_ENV: "production",
	};
	const pollerInvocation = buildWorkflowPollerInvocation();

	return [
		{
			name: "server",
			command: "bun",
			args: ["run", "--filter", "devos-server", "start"],
			env: {
				...baseEnv,
				PIV_SERVER_PORT: ports.serverPort,
			},
		},
		{
			name: "web",
			command: "bun",
			args: ["run", "--filter", "web", "start"],
			env: {
				...baseEnv,
				PORT: ports.webPort,
				DEVOS_SERVER_BASE_URL: serverBaseUrl,
				NEXT_PUBLIC_DEVOS_WORKFLOW_WS_URL: workflowWsUrl,
			},
		},
		{
			name: "workflow-poller",
			command: pollerInvocation.command,
			args: pollerInvocation.args,
			env: {
				...baseEnv,
				DEVOS_SERVER_BASE_URL: serverBaseUrl,
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
	const ports = resolveDaemonPorts(env);
	const serverBaseUrl =
		env.DEVOS_SERVER_BASE_URL ?? `http://127.0.0.1:${ports.serverPort}`;
	const workspaceEnv = resolveDaemonWorkspaceEnv(env, cwd);
	const services = buildDaemonCommandsForPorts(env, ports, cwd);
	const cleanupPorts = options.cleanupPorts ?? cleanupDaemonPorts;
	const workflowWorker = (
		options.startWorkflowWorker ?? startWorkflowCommandWorker
	)({
		cwd,
		env: {
			...workspaceEnv,
			DEVOS_SERVER_BASE_URL: serverBaseUrl,
			DEVOS_WORKFLOW_WS_URL:
				env.DEVOS_WORKFLOW_WS_URL ?? resolveWorkflowWsUrl(serverBaseUrl),
		},
	});
	const children = services.map((service) =>
		spawnChild(service.command, service.args, {
			cwd,
			env: service.env,
			stdio: "inherit",
		}),
	);
	const ready = scheduleDaemonReadyMessage({
		scheduler: options.readinessScheduler,
		write: options.write,
	});

	return superviseDaemonChildren(
		children,
		signalTarget,
		workflowWorker,
		cleanupPorts,
		ports,
		ready,
	);
}

function superviseDaemonChildren(
	children: DaemonChild[],
	signalTarget: DaemonSignalTarget,
	workflowWorker: { stop(): Promise<void> },
	cleanupPorts: DaemonPortCleanup,
	ports: DaemonPortCleanupPorts,
	readiness?: DaemonReadinessHandle,
): Promise<number> {
	return new Promise((resolve) => {
		let resolved = false;
		let isShuttingDown = false;

		const finish = (code: number, cleanupOnFailure = false) => {
			if (resolved) {
				return;
			}
			resolved = true;
			readiness?.cancel();
			for (const signal of SIGNALS) {
				signalTarget.off(signal, signalHandlers[signal]);
			}
			void (async () => {
				if (cleanupOnFailure) {
					await cleanupPorts(ports);
				}
				await workflowWorker.stop();
				resolve(code);
			})();
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
				finish(1, true);
			});
			child.on("close", (code, signal) => {
				if (resolved) {
					return;
				}
				shutdown(signal ?? undefined, child);
				const exitCode = code ?? (signal ? 1 : 0);
				finish(exitCode, exitCode !== 0);
			});
		}
	});
}

const spawnDaemonChild: DaemonSpawn = (command, args, options) =>
	spawn(command, args, options);
