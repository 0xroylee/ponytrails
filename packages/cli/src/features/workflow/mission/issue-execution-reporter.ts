import { normalizeError } from "../../../utils/logger";
import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../../types";
import {
	safeLinearComment,
	safeNotifyTaskOutcome,
} from "../integration-wrappers";
import { emitActionProgress, emitStageProgress } from "../progress";
import { cleanupTerminalIsolatedWorktree } from "../runtime/workflow-worktree";
import { saveRunState } from "../state";
import type {
	IssueExecutionFinalizerInput,
	IssueExecutionStatus,
} from "../types/issue-execution.types";
import type { IssueLogger } from "../types/issue-processing.types";
import type {
	WorkflowLinearClient,
	WorkflowRuntime,
} from "../types/workflow.types";
import { releaseRunLease } from "../workflow-lease";

export class IssueExecutionReporter {
	constructor(
		private readonly config: ResolvedProjectConfig,
		private readonly notifications: ResolvedNotificationConfig,
		private readonly linear: WorkflowLinearClient,
		private readonly runtime: WorkflowRuntime,
		private readonly leaseOwnerId: string,
	) {}

	async handleFailure(
		error: unknown,
		runState: RunState,
		issueLogger: IssueLogger,
	): Promise<IssueExecutionStatus> {
		const message = error instanceof Error ? error.message : String(error);
		const failedStage = runState.stage;
		emitActionProgress(runState, failedStage, "workflow", "failed", {
			error: message,
		});
		emitStageProgress(runState, failedStage, "failed", message);
		runState.lastError = message;
		if (runState.stage !== "done") {
			runState.failedStage = failedStage;
			runState.stage = "failed";
			await saveRunState(this.config.workspacePath, runState);
			await this.markIssueFailed(runState, issueLogger);
			await safeLinearComment(
				this.linear,
				runState.issue.id,
				`devos.ing failed and moved issue to Failed.\n\nError:\n${message}`,
			);
		} else {
			await saveRunState(this.config.workspacePath, runState);
			issueLogger.error(
				{ err: normalizeError(error), stage: runState.stage },
				"Issue workflow failed after reaching done",
			);
			return "failed";
		}
		issueLogger.error(
			{ err: normalizeError(error), stage: runState.stage },
			"Issue workflow failed",
		);
		await safeNotifyTaskOutcome(
			this.notifications,
			runState,
			"failed",
			message,
			{
				sendTaskOutcomeEmail: this.runtime.sendTaskOutcomeEmail,
			},
		);
		return "failed";
	}

	async finishExecution(input: IssueExecutionFinalizerInput): Promise<void> {
		if (input.executionRecorderStarted) {
			try {
				await input.executionRecorder.finish(input.executionStatus);
			} catch (error) {
				input.issueLogger.error(
					{ err: normalizeError(error) },
					"Failed to finish task execution log",
				);
			}
		}
		if (!input.leaseAcquired) {
			return;
		}
		if (input.isolatedWorktreesEnabled) {
			const cleanedUp = await cleanupTerminalIsolatedWorktree(
				this.config,
				input.runState,
				this.runtime,
			);
			if (cleanedUp) {
				await saveRunState(this.config.workspacePath, input.runState);
			}
		}
		await releaseRunLease(
			this.config.workspacePath,
			input.runState,
			this.leaseOwnerId,
		);
	}

	private async markIssueFailed(
		runState: RunState,
		issueLogger: IssueLogger,
	): Promise<void> {
		try {
			await this.linear.markStage(runState.issue.id, "failed");
		} catch (markError) {
			issueLogger.error(
				{ err: normalizeError(markError) },
				"Failed to move issue to Failed",
			);
		}
	}
}
