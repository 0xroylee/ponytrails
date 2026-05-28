import { DaemonManager, buildDaemonCommands } from "./daemon-manager";
import type { RunProductionDaemonOptions } from "./types/daemon.types";

export { buildDaemonCommands };

export async function runProductionDaemon(
	options: RunProductionDaemonOptions = {},
): Promise<number> {
	return new DaemonManager(options).runProduction();
}
