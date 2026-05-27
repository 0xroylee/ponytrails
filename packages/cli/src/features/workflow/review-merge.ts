import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../types";
import type {
	FinalizeReviewMergeDeps,
	ReviewLinearClient,
} from "./types/review-stage.types";

export async function finalizeIssueAfterReviewMerge(
	config: ResolvedProjectConfig,
	notifications: ResolvedNotificationConfig,
	linear: ReviewLinearClient,
	state: RunState,
	deps: FinalizeReviewMergeDeps,
): Promise<void> {
	await linear.markStage(state.issue.id, "done");
	await linear.clearWorkflowStageLabels(state.issue.id);
	await linear.comment(
		state.issue.id,
		"PR squash-merged after completed review.",
	);
	state.pullRequestApprovedAt = new Date().toISOString();
	await deps.saveRunState(config.workspacePath, state);
	await deps.safeNotifyTaskOutcome(notifications, state, "done");
}
