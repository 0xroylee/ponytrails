import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
	DaemonPortCleanupOptions,
	DaemonPortCleanupPorts,
	DaemonPortCleanupRunCommand,
	DaemonPortCleanupSleep,
} from "./daemon.types";

const execFileAsync = promisify(execFile);
const TERM_WAIT_MS = 500;

export async function cleanupDaemonPorts(
	ports: DaemonPortCleanupPorts,
	options: DaemonPortCleanupOptions = {},
): Promise<void> {
	try {
		const runCommand = options.runCommand ?? runPortCommand;
		const killProcess = options.killProcess ?? process.kill;
		const sleep = options.sleep ?? sleepFor;
		const pids = await findListenerPids([ports.serverPort, ports.webPort], {
			runCommand,
		});
		for (const pid of pids) {
			try {
				killProcess(pid, "SIGTERM");
			} catch {}
		}
		if (pids.length === 0) return;

		await sleep(TERM_WAIT_MS);
		const remainingPids = await findListenerPids(
			[ports.serverPort, ports.webPort],
			{ runCommand },
		);
		for (const pid of remainingPids) {
			try {
				killProcess(pid, "SIGKILL");
			} catch {}
		}
	} catch {
		// Cleanup should never mask the daemon failure that triggered it.
	}
}

export async function findListenerPids(
	ports: string[],
	options: { runCommand?: DaemonPortCleanupRunCommand } = {},
): Promise<number[]> {
	const runCommand = options.runCommand ?? runPortCommand;
	const pids = new Set<number>();
	for (const port of ports) {
		let output = "";
		try {
			output = await runCommand("lsof", [
				"-t",
				`-iTCP:${port}`,
				"-sTCP:LISTEN",
			]);
		} catch {
			continue;
		}
		for (const line of output.split(/\r?\n/)) {
			const pid = Number(line.trim());
			if (Number.isInteger(pid) && pid > 0) pids.add(pid);
		}
	}
	return [...pids];
}

async function runPortCommand(
	command: string,
	args: string[],
): Promise<string> {
	try {
		const { stdout } = await execFileAsync(command, args);
		return stdout;
	} catch {
		return "";
	}
}

const sleepFor: DaemonPortCleanupSleep = (ms) =>
	new Promise((resolve) => setTimeout(resolve, ms));
