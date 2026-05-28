import type { AgentAdapter } from "adapters";
import { logger } from "../../../utils/logger";
import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../../types";
import { runAgentWithChatLog } from "../agents/agent-chat-log";
import { handleImplementingStage } from "../implementation/implement-stage";
import { safeNotifyTaskOutcome as safeNotifyTaskOutcomeWithDeps } from "../integration-wrappers";
import { buildIssueJobLogFields } from "../mission/issue-job-log-fields";
import { handlePlanningStage } from "../planning/plan";
import { handleReviewTestingStage } from "../review/review-orchestrator";
import { saveRunState, transitionStage } from "../state";
import type { BuiltInWorkflowPhaseId } from "../types/workflow-metadata.types";
import type {
	WorkflowLinearClient,
	WorkflowRuntime,
} from "../types/workflow.types";
import { appendCodexUsage } from "../usage/usage-state";

export class BuiltInWorkflowPhaseRunner {
	constructor(private readonly runtime: WorkflowRuntime) {}

	async run(input: {
		phaseId: BuiltInWorkflowPhaseId;
		config: ResolvedProjectConfig;
		agent: AgentAdapter;
		notifications: ResolvedNotificationConfig;
		linear: WorkflowLinearClient;
		state: RunState;
	}): Promise<void> {
		if (input.phaseId === "plan") {
			await this.handlePlan(input);
			return;
		}
		if (input.phaseId === "implement") {
			await handleImplementingStage(
				input.config,
				input.agent,
				input.linear,
				input.state,
				this.runtime,
			);
			return;
		}
		await handleReviewTestingStage(
			input.config,
			input.agent,
			input.notifications,
			input.linear,
			input.state,
			this.runtime,
		);
	}

	private async handlePlan(input: {
		config: ResolvedProjectConfig;
		agent: AgentAdapter;
		notifications: ResolvedNotificationConfig;
		linear: WorkflowLinearClient;
		state: RunState;
	}): Promise<void> {
		await handlePlanningStage(
			input.config,
			input.agent,
			input.notifications,
			input.linear,
			input.state,
			{
				runAgentWithChatLog,
				appendCodexUsage,
				saveRunState,
				transitionStage,
				safeNotifyTaskOutcome: (notifyConfig, runState, outcome, error) =>
					safeNotifyTaskOutcomeWithDeps(
						notifyConfig,
						runState,
						outcome,
						error,
						{ sendTaskOutcomeEmail: this.runtime.sendTaskOutcomeEmail },
					),
				loggerInfo: logger.info.bind(logger),
				buildIssueJobLogFields: (runState, stage, stageOptions) => ({
					...buildIssueJobLogFields(runState, stage, stageOptions),
				}),
			},
		);
	}
}
