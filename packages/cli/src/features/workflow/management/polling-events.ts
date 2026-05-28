import { logger, normalizeError } from "../../../utils/logger";
import { emitWorkflowProgress } from "../../server";
import type { ResolvedProjectConfig, RunOptions } from "../../types";
import { appendProjectErrorLog, projectErrorLogPath } from "../state-error-log";
import type { PollingSettings } from "../types/workflow.types";
import { recordCliPollingEvent } from "./polling-observability";

export async function handleProjectCycleError(
	error: unknown,
	config: ResolvedProjectConfig,
	options: RunOptions,
	cycle: number,
	polling: PollingSettings,
): Promise<void> {
	const message = error instanceof Error ? error.message : String(error);
	await recordCliPollingEvent(config, polling, {
		eventType: "cycle_failed",
		level: "error",
		message: "Task polling cycle failed",
		state: "error",
		cycle,
		lastError: message,
		errorAt: new Date().toISOString(),
		finishedAt: new Date().toISOString(),
		metadata: { error: message },
	});
	emitPollingProgress(config.id, "cycle_failed", "failed", {
		detail: `cycle ${cycle} failed`,
		error: message,
	});
	const errorLogPath = projectErrorLogPath(config.workspacePath, config.id);
	try {
		await appendProjectErrorLog(config.workspacePath, config.id, {
			cycle,
			message,
			error: normalizeError(error),
			context: {
				projectName: config.name,
				pollingIntervalMs: polling.intervalMs,
				issueArg: options.issueArg ?? null,
			},
		});
	} catch (appendError) {
		logger.error(
			{
				projectId: config.id,
				cycle,
				errorLogPath,
				err: normalizeError(appendError),
			},
			"Failed to append polling error log entry",
		);
	}
	logger.error(
		{
			projectId: config.id,
			cycle,
			errorLogPath,
			err: normalizeError(error),
		},
		"Project cycle failed during polling; continuing",
	);
}

export async function recordPollingStopped(
	projects: ResolvedProjectConfig[],
	polling: PollingSettings,
	cycle: number,
	totalIssues: number,
	cycleHadError: boolean,
): Promise<void> {
	await Promise.all(
		projects.map((project) =>
			recordCliPollingEvent(project, polling, {
				eventType: "polling_stopped",
				level: "info",
				message: "Task polling stopped",
				state: "stopped",
				cycle,
				finishedAt: new Date().toISOString(),
				metadata: { totalIssues, cycleHadError },
			}),
		),
	);
}

export function emitPollingProgress(
	projectId: string,
	action: string,
	status: "started" | "succeeded" | "failed",
	input: { detail: string; error?: string },
): void {
	emitWorkflowProgress({
		kind: "action",
		projectId,
		stage: "polling",
		action,
		status,
		detail: input.detail,
		...(input.error ? { error: input.error } : {}),
	});
}
