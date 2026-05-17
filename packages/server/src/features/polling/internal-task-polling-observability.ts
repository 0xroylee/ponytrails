import { recordPollingEvent, recordPollingStatus } from "../../db";
import { normalizeError } from "../../logger";
import type { InternalTaskPollingSchedulerOptions } from "./polling.types";

const POLLER_ID = "internal-tasks:server";
const POLLER_SOURCE = {
	pollerId: POLLER_ID,
	sourceType: "internal-tasks",
	sourceId: "server",
};

export async function recordInternalPolling(
	options: InternalTaskPollingSchedulerOptions,
	input: {
		eventType: string;
		level: "info" | "warn" | "error";
		message: string;
		state: "idle" | "running" | "success" | "error" | "stopped" | "skipped";
		counts?: { readyTaskCount?: number; dispatchCount?: number };
		consecutiveFailures?: number;
		lastError?: string | null;
		startedAt?: string;
		finishedAt?: string;
		successAt?: string;
		errorAt?: string;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	try {
		await recordPollingStatus({
			db: options.db,
			...POLLER_SOURCE,
			projectId: null,
			state: input.state,
			intervalMs: options.config.polling.intervalMs,
			counts: input.counts,
			consecutiveFailures: input.consecutiveFailures,
			lastError: input.lastError,
			startedAt: input.startedAt,
			finishedAt: input.finishedAt,
			successAt: input.successAt,
			errorAt: input.errorAt,
		});
		await recordPollingEvent({
			db: options.db,
			...POLLER_SOURCE,
			projectId: null,
			level: input.level,
			eventType: input.eventType,
			message: input.message,
			metadata: input.metadata,
		});
		options.realtimeEvents?.publish({
			type: "polling.event",
			polling: {
				pollerId: POLLER_ID,
				eventType: input.eventType,
				level: input.level,
				message: input.message,
			},
		});
	} catch (error) {
		options.logger.error(
			{ err: normalizeError(error) },
			"Failed to record internal task polling status",
		);
	}
}
