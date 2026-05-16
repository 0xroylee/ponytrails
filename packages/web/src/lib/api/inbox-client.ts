import type {
	HealthRequestOptions,
	InboxMessageRecord,
	InboxMessageScope,
} from "./client.types";
import {
	assertObjectRecord,
	parseListResponse,
	readNullableString,
	readString,
} from "./response-utils";

const INBOX_MESSAGES_PATH = "/api/inbox/messages";

type RequestWithBase = (
	path: string,
	method: "GET" | "POST" | "PATCH" | "DELETE",
	options?: HealthRequestOptions,
	body?: unknown,
) => Promise<unknown>;

export function parseInboxMessageRecord(payload: unknown): InboxMessageRecord {
	const row = assertObjectRecord(payload, INBOX_MESSAGES_PATH);
	return {
		id: readString(row, "id", INBOX_MESSAGES_PATH),
		workspaceId: readString(row, "workspaceId", INBOX_MESSAGES_PATH),
		userId: readString(row, "userId", INBOX_MESSAGES_PATH),
		runId: readString(row, "runId", INBOX_MESSAGES_PATH),
		source: readString(row, "source", INBOX_MESSAGES_PATH),
		kind: readString(row, "kind", INBOX_MESSAGES_PATH),
		body: readString(row, "body", INBOX_MESSAGES_PATH),
		taskId: readNullableString(row, "taskId", INBOX_MESSAGES_PATH),
		agentId: readNullableString(row, "agentId", INBOX_MESSAGES_PATH),
		metadata: readMetadata(row.metadata),
		createdAt: readString(row, "createdAt", INBOX_MESSAGES_PATH),
	};
}

export interface InboxApiMethods {
	listInboxMessages(
		scope: InboxMessageScope,
		options?: HealthRequestOptions,
	): Promise<InboxMessageRecord[]>;
}

export function createInboxApiMethods(
	requestWithBase: RequestWithBase,
): InboxApiMethods {
	return {
		async listInboxMessages(scope, options) {
			const payload = await requestWithBase(
				inboxMessagesPath(scope),
				"GET",
				options,
			);
			return parseListResponse(
				payload,
				INBOX_MESSAGES_PATH,
				parseInboxMessageRecord,
			);
		},
	};
}

function inboxMessagesPath(scope: InboxMessageScope): string {
	const params = new URLSearchParams({
		workspaceId: scope.workspaceId,
		userId: scope.userId,
		runId: scope.runId,
	});
	return `${INBOX_MESSAGES_PATH}?${params.toString()}`;
}

function readMetadata(value: unknown): Record<string, unknown> | null {
	if (value === null) {
		return null;
	}
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`Invalid ${INBOX_MESSAGES_PATH} response field 'metadata'`);
}
