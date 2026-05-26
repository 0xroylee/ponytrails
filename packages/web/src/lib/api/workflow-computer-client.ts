import {
	assertObjectRecord,
	parseListResponse,
	readNumber,
	readString,
} from "./response-utils";
import type { HealthRequestOptions } from "./types/client.types";
import type {
	WorkflowComputerApiMethods,
	WorkflowComputerRecord,
} from "./types/workflow-computer.types";

export function parseWorkflowComputerRecord(
	payload: unknown,
): WorkflowComputerRecord {
	const row = assertObjectRecord(payload, "/api/computers");
	const record: WorkflowComputerRecord = {
		id: readString(row, "id", "/api/computers"),
		name: readString(row, "name", "/api/computers"),
		hostname: readString(row, "hostname", "/api/computers"),
		platform: readString(row, "platform", "/api/computers"),
		arch: readString(row, "arch", "/api/computers"),
		cwd: readString(row, "cwd", "/api/computers"),
		startedAt: readString(row, "startedAt", "/api/computers"),
		workerId: readString(row, "workerId", "/api/computers"),
		status: readWorkflowComputerStatus(row.status),
		connectedAt: readString(row, "connectedAt", "/api/computers"),
		lastSeenAt: readString(row, "lastSeenAt", "/api/computers"),
	};
	if (typeof row.disconnectedAt === "string") {
		record.disconnectedAt = row.disconnectedAt;
	}
	if (row.processId !== undefined) {
		record.processId = readNumber(row, "processId", "/api/computers");
	}
	if (typeof row.user === "string") {
		record.user = row.user;
	}
	return record;
}

export function parseWorkflowComputerList(
	payload: unknown,
): WorkflowComputerRecord[] {
	return parseListResponse(
		payload,
		"/api/computers",
		parseWorkflowComputerRecord,
	);
}

export function createWorkflowComputerApiMethods(
	requestWithBase: (
		path: string,
		method: "GET",
		requestOptions?: HealthRequestOptions,
	) => Promise<unknown>,
): WorkflowComputerApiMethods {
	return {
		async listWorkflowComputers(options) {
			const payload = await requestWithBase("/api/computers", "GET", options);
			return parseWorkflowComputerList(payload);
		},
	};
}

function readWorkflowComputerStatus(
	value: unknown,
): WorkflowComputerRecord["status"] {
	if (value === "online" || value === "offline") {
		return value;
	}
	throw new Error("Invalid /api/computers response field 'status'");
}
