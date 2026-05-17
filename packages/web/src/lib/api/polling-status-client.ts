import type {
	PollingEventRecord,
	PollingStatusRecord,
	PollingStatusResponse,
} from "./polling-status.types";
import {
	assertObjectRecord,
	readNullableString,
	readNumber,
	readString,
} from "./response-utils";

const ENDPOINT = "/api/polling/status";

export function parsePollingStatusResponse(
	payload: unknown,
): PollingStatusResponse {
	const row = assertObjectRecord(payload, ENDPOINT);
	const pollers = row.pollers;
	const events = row.events;
	if (!Array.isArray(pollers)) {
		throw new Error(`Invalid ${ENDPOINT} response field 'pollers'`);
	}
	if (!Array.isArray(events)) {
		throw new Error(`Invalid ${ENDPOINT} response field 'events'`);
	}
	return {
		pollers: pollers.map(parsePollingStatusRecord),
		events: events.map(parsePollingEventRecord),
	};
}

function parsePollingStatusRecord(payload: unknown): PollingStatusRecord {
	const row = assertObjectRecord(payload, ENDPOINT);
	return {
		id: readString(row, "id", ENDPOINT),
		sourceType: readString(row, "sourceType", ENDPOINT),
		sourceId: readString(row, "sourceId", ENDPOINT),
		projectId: readNullableString(row, "projectId", ENDPOINT),
		state: readString(row, "state", ENDPOINT),
		intervalMs: readNumber(row, "intervalMs", ENDPOINT),
		lastStartedAt: readNullableString(row, "lastStartedAt", ENDPOINT),
		lastFinishedAt: readNullableString(row, "lastFinishedAt", ENDPOINT),
		lastSuccessAt: readNullableString(row, "lastSuccessAt", ENDPOINT),
		lastErrorAt: readNullableString(row, "lastErrorAt", ENDPOINT),
		lastIssueCount: readNumber(row, "lastIssueCount", ENDPOINT),
		lastStaleRetryCount: readNumber(row, "lastStaleRetryCount", ENDPOINT),
		lastReadyTaskCount: readNumber(row, "lastReadyTaskCount", ENDPOINT),
		lastDispatchCount: readNumber(row, "lastDispatchCount", ENDPOINT),
		consecutiveFailures: readNumber(row, "consecutiveFailures", ENDPOINT),
		lastError: readNullableString(row, "lastError", ENDPOINT),
		updatedAt: readString(row, "updatedAt", ENDPOINT),
	};
}

function parsePollingEventRecord(payload: unknown): PollingEventRecord {
	const row = assertObjectRecord(payload, ENDPOINT);
	return {
		id: readString(row, "id", ENDPOINT),
		pollerId: readString(row, "pollerId", ENDPOINT),
		sourceType: readString(row, "sourceType", ENDPOINT),
		sourceId: readString(row, "sourceId", ENDPOINT),
		projectId: readNullableString(row, "projectId", ENDPOINT),
		level: readString(row, "level", ENDPOINT),
		eventType: readString(row, "eventType", ENDPOINT),
		message: readString(row, "message", ENDPOINT),
		metadata: readMetadata(row),
		createdAt: readString(row, "createdAt", ENDPOINT),
	};
}

function readMetadata(row: Record<string, unknown>): Record<string, unknown> {
	const value = row.metadata;
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`Invalid ${ENDPOINT} response field 'metadata'`);
}
