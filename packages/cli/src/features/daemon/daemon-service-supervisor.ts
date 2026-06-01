import { scheduleDaemonReadyMessage } from "./daemon-readiness";
import type {
	DaemonChild,
	DaemonPortCleanup,
	DaemonPortCleanupPorts,
	DaemonReadinessHandle,
	DaemonServiceCommand,
	DaemonSignalTarget,
	DaemonSpawn,
	DaemonStartupInput,
} from "./types/daemon.types";
import type { WorkflowCommandWorker } from "./types/workflow-command-worker.types";

const SIGNALS = ["SIGINT", "SIGTERM"] as const;

export function startDaemonServices(
	input: DaemonStartupInput,
	signalTarget: DaemonSignalTarget,
	cleanupPorts: DaemonPortCleanup,
	ports: DaemonPortCleanupPorts,
): Promise<number> {
	return new Promise((resolve) => {
		const children: DaemonChild[] = [];
		let readiness: DaemonReadinessHandle | undefined;
		let resolved = false;
		let isShuttingDown = false;
		let workflowWorker: WorkflowCommandWorker | undefined;

		const finish = (code: number, cleanupOnFailure = false) => {
			if (resolved) return;
			resolved = true;
			readiness?.cancel();
			for (const signal of SIGNALS) {
				signalTarget.off(signal, signalHandlers[signal]);
			}
			void (async () => {
				if (cleanupOnFailure) await cleanupPorts(ports);
				await workflowWorker?.stop();
				resolve(code);
			})();
		};

		const shutdown = (
			signal: NodeJS.Signals = "SIGTERM",
			excludedChild?: DaemonChild,
		) => {
			if (isShuttingDown) return;
			isShuttingDown = true;
			for (const child of children) {
				if (child !== excludedChild && !child.killed) child.kill(signal);
			}
		};

		const startChild = (service: DaemonServiceCommand) => {
			const child = input.spawnChild(service.command, service.args, {
				cwd: input.cwd,
				env: service.env,
				stdio: "inherit",
			});
			children.push(child);
			child.on("error", (error) => {
				writeDaemonFailure(input, `${service.name} failed to start`, error);
				shutdown("SIGTERM", child);
				finish(1, true);
			});
			child.on("close", (code, signal) => {
				if (resolved) return;
				shutdown(signal ?? undefined, child);
				const exitCode = code ?? (signal ? 1 : 0);
				if (exitCode !== 0) {
					writeDaemonFailure(
						input,
						`${service.name} exited with ${formatChildExit(code, signal)}`,
					);
				}
				finish(exitCode, exitCode !== 0);
			});
			return child;
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

		const startWorker = () => {
			workflowWorker = input.startWorkflowWorker();
		};

		void startDaemonServicesInOrder(
			input,
			startChild,
			startWorker,
			() => resolved,
		)
			.then(() => {
				if (!resolved) {
					readiness = scheduleDaemonReadyMessage({
						scheduler: input.readinessScheduler,
						write: input.write,
					});
				}
			})
			.catch((error: Error) => {
				if (!resolved) {
					writeDaemonFailure(input, "startup readiness check failed", error);
					shutdown("SIGTERM");
					finish(1, true);
				}
			});
	});
}

function writeDaemonFailure(
	input: DaemonStartupInput,
	message: string,
	error?: Error,
): void {
	const detail = error ? `: ${error.message}` : "";
	input.write?.(`devos daemon failed: ${message}${detail}\n`);
}

function formatChildExit(
	code: number | null,
	signal: NodeJS.Signals | null,
): string {
	if (code !== null) return `code ${code}`;
	if (signal) return `signal ${signal}`;
	return "unknown status";
}

async function startDaemonServicesInOrder(
	input: DaemonStartupInput,
	startChild: (service: DaemonServiceCommand) => DaemonChild,
	startWorker: () => void,
	isResolved: () => boolean,
): Promise<void> {
	const [server, web, poller] = input.services;
	if (!server || !web || !poller) {
		throw new Error("Daemon services are not configured");
	}
	startChild(server);
	await input.waitForServerReady(input.serverHealthUrl, isResolved);
	if (isResolved()) return;
	startWorker();
	startChild(web);
	await input.waitForWebReady(input.webUrl, isResolved);
	if (isResolved()) return;
	startChild(poller);
}
