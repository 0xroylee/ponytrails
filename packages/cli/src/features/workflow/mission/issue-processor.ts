import { logger } from "../../../utils/logger";
import type { RunState } from "../../types";
import { IssuePipelineExecutor } from "../pipeline/issue-pipeline-executor";
import { emitActionProgress } from "../progress";
import { withExecutionPathLock } from "../runtime/execution-path-lock";
import {
	prepareIsolatedExecutionWorkspace,
	shouldUseIsolatedWorktree,
} from "../runtime/workflow-worktree";
import { normalizeIssueKey, saveRunState } from "../state";
import type { IssueProcessorInput } from "../types/issue-processing.types";
import type { WorkflowIssue } from "../types/workflow.types";
import { createWorkflowExecutionRecorder } from "../workflow-execution-recorder";
import { tryAcquireRunLease } from "../workflow-lease";
import { IssueExecutionReporter } from "./issue-execution-reporter";
import { buildIssueJobLogFields } from "./issue-job-log-fields";
import { IssueRunStateResolver } from "./issue-run-state-resolver";
import { MissionManager } from "./mission-manager";

export class IssueProcessor {
	constructor(private readonly input: IssueProcessorInput) {}

	async process(issue: WorkflowIssue): Promise<void> {
		const { config } = this.input;
		const reporter = this.createReporter();
		const key = normalizeIssueKey(issue.identifier);
		const issueLogger = logger.child({ projectId: config.id, issueKey: key });
		const resolved = await new IssueRunStateResolver(
			config,
			this.input.linear,
			this.input.options,
			issueLogger,
		).resolve(issue);
		if (!resolved) {
			return;
		}

		const { runState, existing, isCanceledState } = resolved;
		const mission = new MissionManager(config).createMission({
			issue,
			state: runState,
			resumed: existing !== null,
		});
		issueLogger.info(
			{
				...buildIssueJobLogFields(runState, runState.stage, {
					resumed: mission.resumed,
				}),
				missionId: mission.id,
			},
			"Taking issue job",
		);

		const executionRecorder = createWorkflowExecutionRecorder(config, runState);
		let executionRecorderStarted = false;
		let executionStatus: "succeeded" | "failed" = "succeeded";
		let leaseAcquired = false;
		const isolatedWorktreesEnabled = shouldUseIsolatedWorktree(
			config,
			this.input.options,
			this.input.effectiveConcurrency,
		);

		try {
			await executionRecorder.start();
			executionRecorderStarted = true;
			emitActionProgress(runState, runState.stage, "issue", "started");
			leaseAcquired = await this.executeWithLease({
				issue,
				runState,
				isCanceledState,
				isolatedWorktreesEnabled,
				issueLogger,
			});
			if (!leaseAcquired) {
				executionStatus = "failed";
				return;
			}
			issueLogger.info({ stage: runState.stage }, "Issue workflow finished");
			emitActionProgress(runState, runState.stage, "workflow", "succeeded");
		} catch (error) {
			executionStatus = await reporter.handleFailure(
				error,
				runState,
				issueLogger,
			);
		} finally {
			await reporter.finishExecution({
				executionRecorder,
				executionRecorderStarted,
				executionStatus,
				leaseAcquired,
				isolatedWorktreesEnabled,
				runState,
				issueLogger,
			});
		}
	}

	private createReporter(): IssueExecutionReporter {
		return new IssueExecutionReporter(
			this.input.config,
			this.input.notifications,
			this.input.linear,
			this.input.runtime,
			this.input.leaseOwnerId,
		);
	}

	private async executeWithLease(input: {
		issue: WorkflowIssue;
		runState: RunState;
		isCanceledState: boolean;
		isolatedWorktreesEnabled: boolean;
		issueLogger: ReturnType<typeof logger.child>;
	}): Promise<boolean> {
		const { config, options } = this.input;
		const execute = () =>
			this.executeIssueWithLease(
				input.issue,
				input.runState,
				input.isCanceledState,
				input.isolatedWorktreesEnabled,
				input.issueLogger,
			);
		if (input.isolatedWorktreesEnabled || options.reviewOnly) {
			return execute();
		}
		return withExecutionPathLock(config.executionPath, execute);
	}

	private async executeIssueWithLease(
		issue: WorkflowIssue,
		runState: RunState,
		isCanceledState: boolean,
		isolatedWorktreesEnabled: boolean,
		issueLogger: ReturnType<typeof logger.child>,
	): Promise<boolean> {
		const { config, leaseOwnerId, leaseTimeoutMs, runtime, options } =
			this.input;
		const leaseAcquired = await tryAcquireRunLease(
			config.workspacePath,
			runState,
			leaseOwnerId,
			leaseTimeoutMs,
		);
		if (!leaseAcquired) {
			issueLogger.info(
				{ leaseOwnerId, currentLeaseOwnerId: runState.lease?.ownerId },
				"Skipping issue because it is already leased by another worker",
			);
			emitActionProgress(runState, runState.stage, "issue", "canceled", {
				detail: "already leased by another worker",
			});
			return false;
		}
		issueLogger.info({ leaseOwnerId }, "Issue lease acquired");
		if (!options.reviewOnly && isCanceledState) {
			await this.input.linear.markStage(issue.id, "plan");
			issueLogger.info(
				{ issueState: issue.state.name, issueStateId: issue.state.id },
				"Moved canceled task back to plan before execution",
			);
		}
		const executionConfig = await this.prepareExecutionConfig(
			runState,
			isolatedWorktreesEnabled,
			issueLogger,
		);
		if (
			isolatedWorktreesEnabled &&
			!config.dryRun &&
			runState.stage !== "done"
		) {
			await runtime.prepareWorktreeDependencies(executionConfig.executionPath);
		}
		await new IssuePipelineExecutor(
			executionConfig,
			this.input.notifications,
			this.input.linear,
			options,
			leaseOwnerId,
			leaseTimeoutMs,
			runtime,
		).execute(runState);
		return true;
	}

	private async prepareExecutionConfig(
		runState: RunState,
		isolatedWorktreesEnabled: boolean,
		issueLogger: ReturnType<typeof logger.child>,
	) {
		const { config, runtime } = this.input;
		if (
			!isolatedWorktreesEnabled ||
			config.dryRun ||
			runState.stage === "done"
		) {
			return config;
		}
		return withExecutionPathLock(config.executionPath, async () => {
			const isolatedConfig = await prepareIsolatedExecutionWorkspace(
				config,
				runState,
				runtime,
			);
			await saveRunState(config.workspacePath, runState);
			issueLogger.info(
				{ executionPath: isolatedConfig.executionPath },
				"Isolated issue worktree prepared",
			);
			return isolatedConfig;
		});
	}
}
