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
	const update: Partial<ChatSessionRow> = {
		updatedAt: new Date().toISOString(),
	};
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
	return repository.updateSession(sessionId, update);
}
