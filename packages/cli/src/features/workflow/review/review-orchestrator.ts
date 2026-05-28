import type { AgentAdapter } from "adapters";
import { logger } from "../../../utils/logger";
import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../../types";
import { runAgentWithChatLog } from "../agents/agent-chat-log";
import {
	safeNotifyHumanReviewRequired as safeNotifyHumanReviewRequiredWithDeps,
	safeNotifyTaskOutcome as safeNotifyTaskOutcomeWithDeps,
	safePrComment as safePrCommentWithDeps,
	safeSquashMergePullRequest as safeSquashMergePullRequestWithDeps,
} from "../integration-wrappers";
import { buildIssueJobLogFields } from "../mission/issue-job-log-fields";
import { shouldSquashMergePullRequestForComplexityScore } from "../planning/plan";
import { createWorkflowRuntime } from "../runtime/workflow-runtime";
import { saveRunState, transitionStage } from "../state";
import type {
	WorkflowLinearClient,
	WorkflowRuntime,
} from "../types/workflow.types";
import { appendCodexUsage } from "../usage/usage-state";
import { finalizeIssueAfterReviewMerge as finalizeIssueAfterReviewMergeInternal } from "./review-merge";
import { handleReviewTestingStage as handleReviewTestingStageInternal } from "./review-stage";
import { readyPullRequestAfterPassingReview } from "./review-stage-helpers";

const DEFAULT_PLANNER_COMPLEXITY_SCORE = 4;
const HUMAN_REVIEW_COMPLEXITY_THRESHOLD = 5;

export async function handleReviewTestingStage(
	config: ResolvedProjectConfig,
	agent: AgentAdapter,
	notifications: ResolvedNotificationConfig,
	linear: WorkflowLinearClient,
	state: RunState,
	runtime: WorkflowRuntime = createWorkflowRuntime(),
): Promise<void> {
	await handleReviewTestingStageInternal(config, agent, linear, state, {
		runAgentWithChatLog,
		appendCodexUsage,
		transitionStage,
		saveRunState,
		safePrComment: (prConfig, runState, body) =>
			safePrCommentWithDeps(prConfig, runState, body, {
				commentOnPr: runtime.commentOnPr,
			}),
		safeNotifyHumanReviewRequired: (runState, reason) =>
			safeNotifyHumanReviewRequiredWithDeps(
				notifications,
				runState,
				runState.complexityScore ?? DEFAULT_PLANNER_COMPLEXITY_SCORE,
				reason,
				{ sendHumanReviewRequiredEmail: runtime.sendHumanReviewRequiredEmail },
			),
		readyPullRequestAfterPassingReview: (prConfig, pr, passed) =>
			readyPullRequestAfterPassingReview(prConfig, pr, passed, {
				markPrReadyForReview: runtime.markPrReadyForReview,
			}),
		loggerInfo: logger.info.bind(logger),
		buildIssueJobLogFields: (runState, stage, stageOptions) => ({
			...buildIssueJobLogFields(runState, stage, stageOptions),
		}),
	});
}

export async function finalizeIssueAfterReviewMerge(
	config: ResolvedProjectConfig,
	notifications: ResolvedNotificationConfig,
	linear: WorkflowLinearClient,
	state: RunState,
	deps?: {
		saveRunState?: typeof saveRunState;
		safeNotifyTaskOutcome?: typeof safeNotifyTaskOutcomeWithDeps;
	},
	runtime: WorkflowRuntime = createWorkflowRuntime(),
): Promise<void> {
	await finalizeIssueAfterReviewMergeInternal(
		config,
		notifications,
		linear,
		state,
		{
			saveRunState: deps?.saveRunState ?? saveRunState,
			safeNotifyTaskOutcome:
				deps?.safeNotifyTaskOutcome ??
				((notifyConfig, runState, outcome, error) =>
					safeNotifyTaskOutcomeWithDeps(
						notifyConfig,
						runState,
						outcome,
						error,
						{ sendTaskOutcomeEmail: runtime.sendTaskOutcomeEmail },
					)),
		},
	);
}

export class ReviewMergeDecisionManager {
	constructor(
		private readonly config: ResolvedProjectConfig,
		private readonly notifications: ResolvedNotificationConfig,
		private readonly linear: WorkflowLinearClient,
		private readonly runtime: WorkflowRuntime,
	) {}

	async maybeParkReviewOnlyConflict(state: RunState): Promise<boolean> {
		if (!state.pullRequest) {
			return false;
		}
		const mergeStatus = await this.runtime.getPullRequestMergeStatus(
			this.config,
			state.pullRequest,
		);
		if (!isPullRequestMergeConflicted(mergeStatus)) {
			return false;
		}

		const reason = `PR merge conflict detected for ${state.issue.key}; skipping automated review/testing and requiring human review.`;
		Object.assign(state, transitionStage(state, "in_review"));
		if (!state.humanReviewNotifiedAt) {
			await this.linear.comment(
				state.issue.id,
				[
					"Hourly review skipped because the PR has merge conflicts.",
					reason,
					state.pullRequest.url ? `PR: ${state.pullRequest.url}` : undefined,
				]
					.filter(Boolean)
					.join("\n"),
			);
			await safeNotifyHumanReviewRequiredWithDeps(
				this.notifications,
				state,
				state.complexityScore ?? DEFAULT_PLANNER_COMPLEXITY_SCORE,
				reason,
				{
					sendHumanReviewRequiredEmail:
						this.runtime.sendHumanReviewRequiredEmail,
				},
			);
			state.humanReviewNotifiedAt = new Date().toISOString();
		}
		await saveRunState(this.config.workspacePath, state);
		return true;
	}

	async handleDoneReviewMergeStage(state: RunState): Promise<void> {
		if (state.pullRequestApprovedAt) {
			return;
		}

		const score = state.complexityScore ?? DEFAULT_PLANNER_COMPLEXITY_SCORE;
		if (!shouldSquashMergePullRequestForComplexityScore(score)) {
			await this.notifyHumanApprovalRequired(state, score);
			return;
		}

		const merged = await safeSquashMergePullRequestWithDeps(
			this.config,
			state,
			{
				squashMergePullRequest: this.runtime.squashMergePullRequest,
			},
		);
		if (!merged) {
			return;
		}

		await finalizeIssueAfterReviewMerge(
			this.config,
			this.notifications,
			this.linear,
			state,
			undefined,
			this.runtime,
		);
	}

	private async notifyHumanApprovalRequired(
		state: RunState,
		score: number,
	): Promise<void> {
		const reason = `Planning complexity score ${score}/10 requires human PR approval (threshold >= ${HUMAN_REVIEW_COMPLEXITY_THRESHOLD}).`;
		if (state.humanReviewNotifiedAt) {
			return;
		}
		await this.linear.comment(
			state.issue.id,
			[
				`Human PR approval required for ${state.issue.key}.`,
				reason,
				state.pullRequest?.url ? `PR: ${state.pullRequest.url}` : undefined,
			]
				.filter(Boolean)
				.join("\n"),
		);
		await safeNotifyHumanReviewRequiredWithDeps(
			this.notifications,
			state,
			score,
			reason,
			{
				sendHumanReviewRequiredEmail: this.runtime.sendHumanReviewRequiredEmail,
			},
		);
		state.humanReviewNotifiedAt = new Date().toISOString();
		await saveRunState(this.config.workspacePath, state);
	}
}

function isPullRequestMergeConflicted(input: {
	mergeStateStatus?: string;
	mergeable?: string;
}): boolean {
	return (
		input.mergeStateStatus?.toUpperCase() === "DIRTY" ||
		input.mergeable?.toUpperCase() === "CONFLICTING"
	);
}
