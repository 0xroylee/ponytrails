import type { AgentBackend } from "adapters";
import type { AgentStreamEvent } from "devos-agents";
import type {
	CodexUsageRecord,
	IssueRef,
	PlannedSplitTask,
	ResolvedNotificationConfig,
	RunState,
} from "../../types";

export interface PlanningLinearClient {
	markStage(issueId: string, stage: string): Promise<void>;
	comment(issueId: string, body: string): Promise<void>;
	createTodoIssueFromPlan(
		parentIssue: IssueRef,
		task: PlannedSplitTask,
	): Promise<{ identifier: string; title: string; url: string }>;
	clearWorkflowStageLabels(issueId: string): Promise<void>;
}

export type PlannerDecision = PlannerReadyDecision | PlannerNeedsInfoDecision;

export interface PlannerReadyDecision {
	result: "READY";
	complexity: "SIMPLE" | "COMPLEX";
	splitTasks: PlannedSplitTask[];
	complexityScore: number;
	successGoal: string;
}

export interface PlannerNeedsInfoDecision {
	result: "NEEDS_INFO";
	questions: string[];
}

export interface HandlePlanningStageDeps {
	runAgentWithChatLog: (input: {
		workspacePath: string;
		projectId: string;
		issue: RunState["issue"];
		agentRole: "planning";
		skillPath: string;
		prompt: string;
		invoke: (input?: {
			onStream: (event: AgentStreamEvent) => void;
		}) => Promise<{
			finalMessage: string;
			stdout: string;
			sessionId?: string;
			backend?: AgentBackend;
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
		backend?: AgentBackend;
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
		metadata?: Pick<CodexUsageRecord, "agentBackend" | "model">,
	) => void;
	saveRunState: (cwd: string, state: RunState) => Promise<void>;
	transitionStage: (state: RunState, to: RunState["stage"]) => RunState;
	safeNotifyTaskOutcome: (
		notifications: ResolvedNotificationConfig,
		state: RunState,
		outcome: "done" | "canceled" | "failed",
		errorMessage?: string,
	) => Promise<void>;
	loggerInfo: (fields: Record<string, unknown>, message: string) => void;
	buildIssueJobLogFields: (
		state: RunState,
		stage: string,
		options?: { resumed?: boolean },
	) => Record<string, unknown>;
}
