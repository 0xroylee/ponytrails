import type { LoadedConfig } from "../config";
import type { RunOptions } from "../types";
import {
	handleProjectCycleError,
	recordPollingStopped,
} from "./management/polling-events";
import { shouldStopPolling } from "./management/polling-settings";
import { ProjectCycleRunner } from "./management/project-cycle-runner";
import {
	handleNoProjectSelection,
	pickProjects,
	resolveWorkflowPolling,
	routeProjectContextsForTargetIssue,
	sleepForWorkflow,
	usesAllProjectScope,
} from "./management/project-selection";
import { WorkflowManager } from "./management/workflow-manager";
import { createWorkflowRuntime } from "./runtime/workflow-runtime";
import type { WorkflowRuntime } from "./types/workflow.types";

export async function runWorkflow(
	config: LoadedConfig,
	options: RunOptions,
	runtime: WorkflowRuntime = createWorkflowRuntime(),
): Promise<void> {
	await new WorkflowManager(config, options, runtime, {
		resolvePolling: resolveWorkflowPolling,
		pickProjects,
		usesAllProjectScope,
		routeProjectContextsForTargetIssue,
		handleNoProjectSelection,
		runProjectCycle: ({ project, linear, cycle, polling }) =>
			new ProjectCycleRunner(
				project,
				config.notifications,
				options,
				linear,
				polling,
				runtime,
			).run(cycle),
		handleProjectCycleError: ({ error, project, cycle, polling }) =>
			handleProjectCycleError(error, project, options, cycle, polling),
		shouldStopPolling: ({
			polling,
			options: runOptions,
			cycle,
			totalIssues,
			cycleHadError,
		}) =>
			shouldStopPolling(polling, runOptions, cycle, totalIssues, cycleHadError),
		handlePollingStopped: ({
			contexts,
			polling,
			cycle,
			totalIssues,
			cycleHadError,
		}) =>
			recordPollingStopped(
				contexts.map((context) => context.config),
				polling,
				cycle,
				totalIssues,
				cycleHadError,
			),
		sleepForWorkflow,
	}).run();
}
