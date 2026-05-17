import {
	initializeServerDatabase,
	recordPollingEvent,
	recordPollingStatus,
} from "devos-server/db";
import type { ResolvedProjectConfig } from "../../features/types";
import { logger, normalizeError } from "../../utils/logger";
import type { PollingSettings } from "./workflow.types";

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
		const database = await initializeServerDatabase(
			config.server.database.databasePath,
		);
		try {
			const consecutiveFailures = nextFailureCount(pollerId, input.state);
			await recordPollingStatus({
				db: database.db,
				pollerId,
				sourceType: "linear",
				sourceId: config.id,
				projectId: config.id,
				state: input.state,
				intervalMs: polling.intervalMs,
				counts: input.counts,
				consecutiveFailures,
				lastError: input.lastError,
				startedAt: input.startedAt,
				finishedAt: input.finishedAt,
				successAt: input.successAt,
				errorAt: input.errorAt,
			});
			await recordPollingEvent({
				db: database.db,
				pollerId,
				sourceType: "linear",
				sourceId: config.id,
				projectId: config.id,
				level: input.level,
				eventType: input.eventType,
				message: input.message,
				metadata: { cycle: input.cycle, ...(input.metadata ?? {}) },
			});
		} finally {
			await database.close();
		}
	} catch (error) {
		logger.error(
			{ projectId: config.id, err: normalizeError(error) },
			"Failed to record CLI polling status",
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
