import { createAgentAdapter } from "../integrations/agent-adapters";
import {
	commentOnPr,
	createDraftPrFromWorktree,
	ensureBaseBranchFresh,
	findOpenPullRequestForIssue,
	getPullRequestMergeStatus,
	markPrReadyForReview,
	prepareImplementationBranch,
	squashMergePullRequest,
	updateDraftPrFromWorktree,
} from "../integrations/github";
import { LinearClient } from "../integrations/linear";
import {
	sendHumanReviewRequiredEmail,
	sendTaskOutcomeEmail,
} from "../integrations/notifications";
import type { WorkflowRuntime } from "./workflow.types";
export type { WorkflowLinearClient, WorkflowRuntime } from "./workflow.types";

export function createWorkflowRuntime(
	overrides: Partial<WorkflowRuntime> = {},
): WorkflowRuntime {
	return {
		createLinearClient: (config) => new LinearClient(config),
		createAgentAdapter,
		ensureBaseBranchFresh,
		findOpenPullRequestForIssue,
		getPullRequestMergeStatus,
		prepareImplementationBranch,
		createDraftPrFromWorktree,
		updateDraftPrFromWorktree,
		commentOnPr,
		markPrReadyForReview,
		squashMergePullRequest,
		sendTaskOutcomeEmail,
		sendHumanReviewRequiredEmail,
		...overrides,
	};
}
