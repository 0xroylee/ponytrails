import { tokenUsageTable } from "devos-db";

import type { WorkflowTaskExecutionUsageInput } from "./types/workflow-data.types";
import type { WorkflowDataContext } from "./workflow-data-actions";

export async function recordTaskExecutionUsage(
	context: WorkflowDataContext,
	input: {
		executionLogId: string;
		taskId: string;
		usage?: WorkflowTaskExecutionUsageInput[];
	},
): Promise<void> {
	if (!input.usage?.length) {
		return;
	}
	await context.db
		.insert(tokenUsageTable)
		.values(
			input.usage.map((usage) => ({
				id: usage.id,
				runId: usage.runId,
				taskId: input.taskId,
				taskExecutionLogId: input.executionLogId,
				stage: usage.stage,
				agentBackend: usage.agentBackend ?? null,
				model: usage.model ?? null,
				inputTokens: usage.inputTokens,
				outputTokens: usage.outputTokens,
				totalTokens: usage.totalTokens,
				estimatedCostMicrousd: usage.estimatedCostMicrousd ?? null,
				recordedAt: usage.recordedAt,
			})),
		)
		.onConflictDoNothing();
}
