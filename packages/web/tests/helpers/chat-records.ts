import type { ChatMessageRecord, ChatSessionRecord } from "../../src/lib/api";

export function chatMessage(
	overrides: Partial<ChatMessageRecord> = {},
): ChatMessageRecord {
	return {
		id: "message-1",
		sessionId: "session-1",
		role: "assistant",
		kind: "message",
		content: "Message",
		taskId: null,
		commandAction: null,
		metadata: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}

export function chatSession(
	overrides: Partial<ChatSessionRecord> = {},
): ChatSessionRecord {
	return {
		id: "session-1",
		workspaceId: "owner-1",
		projectId: "default",
		taskId: "task-1",
		title: "Untitled",
		pendingRequest: null,
		pendingQuestions: [],
		archived: false,
		pinned: false,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}
