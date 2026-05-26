import type { ChatMessageRow, ChatSessionRow } from "devos-db";
import { UNTITLED_SESSION } from "./chat-defaults";
import type {
	ChatMessageCreateInput,
	ChatRepository,
	ChatSessionUpdateInput,
} from "./types/chat.types";

export async function appendChatMessage(
	repository: ChatRepository,
	sessionId: string,
	input: ChatMessageCreateInput,
): Promise<ChatMessageRow> {
	const now = new Date().toISOString();
	return repository.addMessage(sessionId, {
		id: crypto.randomUUID(),
		sessionId,
		role: input.role,
		kind: input.kind ?? "message",
		content: input.content,
		taskId: input.taskId ?? null,
		commandAction: input.commandAction ?? null,
		metadata: input.metadata ? JSON.stringify(input.metadata) : null,
		createdAt: now,
	});
}

export async function updateChatSessionRow(
	repository: ChatRepository,
	sessionId: string,
	input: ChatSessionUpdateInput,
): Promise<ChatSessionRow | null> {
	const update: Partial<ChatSessionRow> = {};
	if (input.title !== undefined) {
		update.title = input.title.trim() || UNTITLED_SESSION;
	}
	if (input.projectId !== undefined) {
		update.projectId = input.projectId;
	}
	if (input.taskId !== undefined) {
		update.taskId = input.taskId;
	}
	if (input.pendingRequest !== undefined) {
		update.pendingRequest = input.pendingRequest;
	}
	if (input.pendingQuestions !== undefined) {
		update.pendingQuestions = input.pendingQuestions
			? JSON.stringify(input.pendingQuestions)
			: null;
	}
	if (input.archived !== undefined) {
		update.archived = input.archived;
	}
	if (input.pinned !== undefined) {
		update.pinned = input.pinned;
	}
	if (shouldTouchUpdatedAt(input)) {
		update.updatedAt = new Date().toISOString();
	}
	if (Object.keys(update).length === 0) {
		update.updatedAt = new Date().toISOString();
	}
	return repository.updateSession(sessionId, update);
}

function shouldTouchUpdatedAt(input: ChatSessionUpdateInput): boolean {
	return Boolean(
		input.archived !== undefined ||
			input.projectId !== undefined ||
			input.taskId !== undefined ||
			input.title !== undefined ||
			input.pendingRequest !== undefined ||
			input.pendingQuestions !== undefined,
	);
}
