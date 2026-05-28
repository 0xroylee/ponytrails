import { logger } from "../../../utils/logger";
import type { LoadedConfig } from "../../config";
import type { RunOptions } from "../../types";
import { resolvePollingSettings } from "../../workflow/management/polling-settings";
import { runWorkflow } from "../../workflow/workflow";
import { resolveWorkflowDataWsUrl } from "../../workflow/workflow-data-client";

export async function handleRunCommand(
	config: LoadedConfig,
	options: RunOptions,
): Promise<void> {
	logWorkflowRunStart(config, options);
	await runWorkflow(config, options);
}

function logWorkflowRunStart(config: LoadedConfig, options: RunOptions): void {
	const polling = resolvePollingSettings(config.polling, options);
	logger.info(
		{
			scope: resolveRunScope(options),
			projectSource: options.projectId ? "cli" : "server",
			issueArg: options.issueArg,
			projectId: options.projectId,
			pollingEnabled: polling.enabled,
			pollForever: options.pollForever === true,
			maxPollCycles: polling.maxCycles,
			pollIntervalMs: polling.intervalMs,
			exitWhenIdle: polling.exitWhenIdle,
			workflowDataUrl: resolveWorkflowDataWsUrl(process.env),
		},
		"Starting workflow run",
	);
}

function resolveRunScope(options: RunOptions): string {
	if (options.projectId) {
		return "project";
	}
	if (options.issueArg) {
		return "issue";
	}
	return "server-projects";
}
