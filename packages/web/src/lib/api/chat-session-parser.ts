import {
	assertObjectRecord,
	readBoolean,
	readNullableString,
	readString,
} from "./response-utils";
import type { ChatSessionRecord } from "./types/chat.types";
import type {
	TaskClarificationOption,
	TaskClarificationQuestion,
} from "./types/task.types";

const CHAT_SESSIONS_PATH = "/api/chat/sessions";

export function parseChatSessionRecord(payload: unknown): ChatSessionRecord {
	const row = assertObjectRecord(payload, CHAT_SESSIONS_PATH);
	return {
		id: readString(row, "id", CHAT_SESSIONS_PATH),
		workspaceId: readString(row, "workspaceId", CHAT_SESSIONS_PATH),
		projectId: readNullableString(row, "projectId", CHAT_SESSIONS_PATH),
		taskId: readNullableString(row, "taskId", CHAT_SESSIONS_PATH),
		title: readString(row, "title", CHAT_SESSIONS_PATH),
		pendingRequest: readNullableString(
			row,
			"pendingRequest",
			CHAT_SESSIONS_PATH,
		),
		pendingQuestions: readQuestionList(row.pendingQuestions),
		archived: readOptionalBoolean(row, "archived"),
		pinned: readOptionalBoolean(row, "pinned"),
		createdAt: readString(row, "createdAt", CHAT_SESSIONS_PATH),
		updatedAt: readString(row, "updatedAt", CHAT_SESSIONS_PATH),
	};
}

function readOptionalBoolean(
	row: Record<string, unknown>,
	key: string,
): boolean {
	return key in row ? readBoolean(row, key, CHAT_SESSIONS_PATH) : false;
}

function readQuestionList(value: unknown): TaskClarificationQuestion[] {
	if (!Array.isArray(value)) {
		throw new Error("Invalid chat session field 'pendingQuestions'");
	}
	return value.map(readQuestion);
}

function readQuestion(value: unknown): TaskClarificationQuestion {
	if (typeof value === "string" && value.trim()) {
		return { question: value.trim() };
	}
	const row = assertObjectRecord(value, `${CHAT_SESSIONS_PATH}:question`);
	const options =
		"options" in row ? readQuestionOptions(row.options) : undefined;
	return {
		question: readString(row, "question", CHAT_SESSIONS_PATH),
		...(options?.length ? { options } : {}),
	};
}

function readQuestionOptions(value: unknown): TaskClarificationOption[] {
	if (!Array.isArray(value)) {
		throw new Error("Invalid chat session field 'pendingQuestions.options'");
	}
	return value.map((item) => {
		const row = assertObjectRecord(item, `${CHAT_SESSIONS_PATH}:option`);
		const description =
			"description" in row
				? readString(row, "description", CHAT_SESSIONS_PATH)
				: undefined;
		const recommended =
			"recommended" in row
				? readBoolean(row, "recommended", CHAT_SESSIONS_PATH)
				: undefined;
		return {
			label: readString(row, "label", CHAT_SESSIONS_PATH),
			value: readString(row, "value", CHAT_SESSIONS_PATH),
			...(description ? { description } : {}),
			...(recommended ? { recommended } : {}),
		};
	});
}
