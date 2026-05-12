import type {
	CodexUsageRecord,
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../../core/types";
import type { AgentAdapter } from "../../integrations/agent-adapters";
import { markPrReadyForReview } from "../../integrations/github";
import { buildReviewComment } from "../../utils/comments";
import { buildGithubCommentPrompt, buildReviewPrompt } from "../skills/prompts";
import type { ReviewOutcome } from "./review";
import { parseReviewOutcome } from "./review";

interface HandleReviewTestingStageDeps {
	runAgentWithChatLog: (input: {
		workspacePath: string;
		projectId: string;
		issue: RunState["issue"];
		agentRole: "review-testing" | "github-comment";
		skillPath: string;
		prompt: string;
		invoke: () => Promise<{
			finalMessage: string;
			stdout: string;
			sessionId?: string;
			usage?: {
				inputTokens?: number;
				outputTokens?: number;
				totalTokens?: number;
			};
		}>;
	}) => Promise<{
		finalMessage: string;
		stdout: string;
		sessionId?: string;
		usage?: {
			inputTokens?: number;
			outputTokens?: number;
			totalTokens?: number;
		};
	}>;
	appendCodexUsage: (
		state: RunState,
		stage: CodexUsageRecord["stage"],
		usage:
			| { inputTokens?: number; outputTokens?: number; totalTokens?: number }
			| undefined,
	) => void;
	transitionStage: (state: RunState, to: RunState["stage"]) => RunState;
	saveRunState: (cwd: string, state: RunState) => Promise<void>;
	safePrComment: (
		config: ResolvedProjectConfig,
		state: RunState,
		body: string,
	) => Promise<void>;
	readyPullRequestAfterPassingReview?: typeof readyPullRequestAfterPassingReview;
	loggerInfo: (fields: Record<string, unknown>, message: string) => void;
	buildIssueJobLogFields: (
		state: RunState,
		stage: string,
		options?: { resumed?: boolean },
	) => Record<string, unknown>;
}

interface FinalizeReviewMergeDeps {
	saveRunState: (cwd: string, state: RunState) => Promise<void>;
	safeNotifyTaskOutcome: (
		notifications: ResolvedNotificationConfig,
		state: RunState,
		outcome: "done" | "blocked",
		errorMessage?: string,
	) => Promise<void>;
}

interface ReviewLinearClient {
	markStage(issueId: string, stage: string): Promise<void>;
	applyStageLabel(issueId: string, stage: string): Promise<void>;
	clearWorkflowStageLabels(issueId: string): Promise<void>;
	comment(issueId: string, body: string): Promise<void>;
}

export function resolveReviewFailureStage(
	state: Pick<RunState, "codexSessionId">,
): Extract<RunState["stage"], "implementing" | "human_review"> {
	return state.codexSessionId ? "implementing" : "human_review";
}

export function normalizeFailedReviewBugs(
	outcome: ReviewOutcome,
): RunState["bugs"] {
	if (outcome.passed) {
		return [];
	}
	if (outcome.bugs.length > 0) {
		return outcome.bugs;
	}
	const summary =
		outcome.summary.trim() ||
		"Review/testing failed but no structured BUGS_JSON details were provided.";
	return [
		{
			title: "Review/testing failed without structured bug details",
			body: summary,
		},
	];
}

export async function readyPullRequestAfterPassingReview(
	config: ResolvedProjectConfig,
	pullRequest: RunState["pullRequest"],
	passed: boolean,
	deps?: {
		markPrReadyForReview?: typeof markPrReadyForReview;
	},
): Promise<boolean> {
	if (!passed || config.dryRun || !pullRequest) {
		return false;
	}
	const markReady = deps?.markPrReadyForReview ?? markPrReadyForReview;
	return markReady(config, pullRequest);
}

export async function handleReviewTestingStage(
	config: ResolvedProjectConfig,
	agent: AgentAdapter,
	linear: ReviewLinearClient,
	state: RunState,
	deps: HandleReviewTestingStageDeps,
): Promise<void> {
	deps.loggerInfo(
		deps.buildIssueJobLogFields(state, "testing"),
		"Testing issue",
	);
	await linear.markStage(state.issue.id, "testing");
	await linear.applyStageLabel(state.issue.id, "testing");
	Object.assign(state, deps.transitionStage(state, "testing"));
	await deps.saveRunState(config.workspacePath, state);

	const prompt = await buildReviewPrompt(
		config.skills.reviewTest,
		state.issue,
		state.pullRequest,
	);
	const review = await deps.runAgentWithChatLog({
		workspacePath: config.workspacePath,
		projectId: config.id,
		issue: state.issue,
		agentRole: "review-testing",
		skillPath: config.skills.reviewTest,
		prompt,
		invoke: () => agent.runReview(prompt),
	});
	const outcome = parseReviewOutcome(review.finalMessage || review.stdout);
	const retryBugs = normalizeFailedReviewBugs(outcome);
	deps.appendCodexUsage(state, "testing", review.usage);
	state.reviewSessionId = review.sessionId;
	state.reviewSummary = outcome.summary;
	state.testingSummary = outcome.summary;
	state.bugs = retryBugs;
	await deps.saveRunState(config.workspacePath, state);

	const reviewComment = buildReviewComment({
		issueKey: state.issue.key,
		passed: outcome.passed,
		summary: outcome.summary,
		usage: review.usage,
		bugs: retryBugs,
	});

	let githubComment = reviewComment;
	if (!config.dryRun && state.pullRequest) {
		try {
			const githubCommentPrompt = await buildGithubCommentPrompt(
				config.skills.githubComment,
				state.issue,
				state.pullRequest,
				{
					passed: outcome.passed,
					summary: outcome.summary,
					bugs: retryBugs,
				},
			);
			const githubCommentResult = await deps.runAgentWithChatLog({
				workspacePath: config.workspacePath,
				projectId: config.id,
				issue: state.issue,
				agentRole: "github-comment",
				skillPath: config.skills.githubComment,
				prompt: githubCommentPrompt,
				invoke: () => agent.runGithubComment(githubCommentPrompt),
			});
			deps.appendCodexUsage(state, "testing", githubCommentResult.usage);
			await deps.saveRunState(config.workspacePath, state);
			const generated =
				githubCommentResult.finalMessage?.trim() ||
				githubCommentResult.stdout?.trim();
			if (generated) {
				githubComment = generated;
			}
		} catch (error) {
			deps.loggerInfo(
				{
					...deps.buildIssueJobLogFields(state, "testing"),
					error: error instanceof Error ? error.message : String(error),
				},
				"GitHub comment generation failed; using default review comment",
			);
		}
	}

	if (!config.dryRun && state.pullRequest) {
		await deps.safePrComment(config, state, githubComment);
	}
	await linear.comment(state.issue.id, reviewComment);

	if (!outcome.passed) {
		const nextStage = resolveReviewFailureStage(state);
		Object.assign(state, deps.transitionStage(state, nextStage));
		await deps.saveRunState(config.workspacePath, state);
		if (nextStage === "implementing") {
			await linear.markStage(state.issue.id, nextStage);
			await linear.comment(
				state.issue.id,
				"Review/testing failed. Feedback was sent back to implementation for another pass.",
			);
		} else {
			await linear.markStage(state.issue.id, "reviewing");
			await linear.applyStageLabel(state.issue.id, "reviewing");
			await linear.comment(
				state.issue.id,
				"Review/testing failed, but no resumable implementation session is available. Parked for manual review and PR updates.",
			);
		}
		return;
	}

	await (
		deps.readyPullRequestAfterPassingReview ??
		readyPullRequestAfterPassingReview
	)(config, state.pullRequest, true);
	Object.assign(state, deps.transitionStage(state, "done"));
	await deps.saveRunState(config.workspacePath, state);
	await linear.markStage(state.issue.id, "reviewing");
	await linear.applyStageLabel(state.issue.id, "reviewing");
	await linear.comment(
		state.issue.id,
		"Review/testing passed. PR is ready and issue remains in review until merge.",
	);
	deps.loggerInfo(
		deps.buildIssueJobLogFields(state, "testing"),
		"Review/testing completed",
	);
}

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
