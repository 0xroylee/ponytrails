import { logger, normalizeError } from "../../../utils/logger";
import type { ResolvedProjectConfig } from "../../types";
import { createReliableWorkflowDataClient } from "../reliable-workflow-data-client";
import type { PollingSettings } from "../types/workflow.types";
import type { WorkflowPollingRecordInput } from "../workflow-data-protocol";

const failureCounts = new Map<string, number>();

export async function recordCliPollingEvent(
	config: ResolvedProjectConfig,
	polling: PollingSettings,
	input: {
		eventType: string;
		level: "info" | "warn" | "error";
		message: string;
		state: "running" | "success" | "error" | "stopped";
		cycle: number;
		counts?: { issueCount?: number; staleRetryCount?: number };
		lastError?: string | null;
		startedAt?: string;
		finishedAt?: string;
		successAt?: string;
		errorAt?: string;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	if (!polling.enabled) {
		return;
	}
	const pollerId = `linear:${config.id}`;
	try {
		const payload: WorkflowPollingRecordInput = {
			pollerId,
			sourceType: "linear",
			sourceId: config.id,
			projectId: config.id,
			state: input.state,
			intervalMs: polling.intervalMs,
			counts: input.counts,
			consecutiveFailures: nextFailureCount(pollerId, input.state),
			lastError: input.lastError,
			startedAt: input.startedAt,
			finishedAt: input.finishedAt,
			successAt: input.successAt,
			errorAt: input.errorAt,
			level: input.level,
			eventType: input.eventType,
			message: input.message,
			metadata: { cycle: input.cycle, ...(input.metadata ?? {}) },
		};
		await createReliableWorkflowDataClient({
			context: { workspacePath: config.workspacePath, projectId: config.id },
		}).request("polling.record", payload);
	} catch (error) {
		logger.warn(
			{ projectId: config.id, err: normalizeError(error) },
			"Workflow data reporting unavailable; continuing without server polling status",
		);
	}
}

function nextFailureCount(pollerId: string, state: string): number {
	if (state === "error") {
		const next = (failureCounts.get(pollerId) ?? 0) + 1;
		failureCounts.set(pollerId, next);
		return next;
	}
	if (state === "success") {
		failureCounts.set(pollerId, 0);
		return 0;
	}
	return failureCounts.get(pollerId) ?? 0;
}
