import { logger } from "../../../utils/logger";
import { type LoadedConfig, getProjectById } from "../../config";
import type { ResolvedProjectConfig, RunOptions } from "../../types";
import type { PollingSettings, WorkflowRuntime } from "../types/workflow.types";
import { resolvePollingSettings, sleep } from "./polling-settings";
import { routeProjectsForIssueProjectId } from "./project-routing";
import type { ProjectWorkflowContext } from "./workflow-manager";

export function resolveWorkflowPolling(
	config: LoadedConfig,
	options: RunOptions,
): PollingSettings {
	return resolvePollingSettings(config.polling, options);
}

export function pickProjects(
	config: LoadedConfig,
	options: RunOptions,
	polling: PollingSettings,
): ResolvedProjectConfig[] {
	if (options.projectId) {
		const project = getProjectById(config, options.projectId);
		if (!project) {
			throw new Error(`Project '${options.projectId}' not found`);
		}
		return [project];
	}
	if (usesAllProjectScope(options, polling)) {
		return config.projects;
	}
	return config.projects.slice(0, 1);
}

export function usesAllProjectScope(
	options: RunOptions,
	polling: PollingSettings,
): boolean {
	return (
		options.allProjects === true ||
		(!options.projectId && (polling.enabled || options.issueArg !== undefined))
	);
}

export async function handleNoProjectSelection(
	polling: PollingSettings,
	options: RunOptions,
	runtime: WorkflowRuntime,
): Promise<void> {
	if (options.pollForever === true && !options.issueArg) {
		while (true) {
			logger.info(
				{ pollIntervalMs: polling.intervalMs },
				"No projects configured; waiting before next workflow poll.",
			);
			await sleepForWorkflow(runtime, polling.intervalMs);
		}
	}

	logger.info("No project selected.");
}

export async function sleepForWorkflow(
	runtime: WorkflowRuntime,
	intervalMs: number,
): Promise<void> {
	await (runtime.sleep?.(intervalMs) ?? sleep(intervalMs));
}

export async function routeProjectContextsForTargetIssue<
	TProject extends ResolvedProjectConfig,
>(
	contexts: Array<ProjectWorkflowContext<TProject>>,
	issueArg: string,
): Promise<Array<ProjectWorkflowContext<TProject>>> {
	const routeLogger = logger.child({ issueArg });
	const issue = await contexts[0]?.linear.fetchIssueByIdentifier(issueArg);
	if (!issue) {
		routeLogger.info("Target issue was not found; skipping run.");
		return [];
	}

	const routing = routeProjectsForIssueProjectId(
		contexts.map((context) => context.config),
		issue.projectId,
	);
	if (routing.error) {
		throw new Error(routing.error);
	}
	if (!routing.selectedProjectId) {
		routeLogger.info(
			{
				issueKey: issue.identifier,
				issueProjectId: issue.projectId ?? null,
				reason: routing.skipReason,
			},
			"Target issue is not routable to any configured project; skipping run",
		);
		return [];
	}

	const selected = contexts.filter(
		(context) => context.config.id === routing.selectedProjectId,
	);
	routeLogger.info(
		{
			issueKey: issue.identifier,
			issueProjectId: issue.projectId ?? null,
			projectId: routing.selectedProjectId,
		},
		"Routed target task to project by source project id",
	);
	return selected;
}
