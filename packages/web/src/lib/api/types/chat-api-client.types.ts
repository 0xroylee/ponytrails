import type {
	ChatMessageCreateRequest,
	ChatMessageRecord,
	ChatSendRequest,
	ChatSendResponse,
	ChatSessionCreateRequest,
	ChatSessionRecord,
	ChatSessionUpdateRequest,
} from "./chat.types";
import type { HealthRequestOptions } from "./health.types";

export interface ChatApiClientMethods {
	listChatSessions(
		workspaceId: string,
		options?: HealthRequestOptions,
	): Promise<ChatSessionRecord[]>;
	createChatSession(
		request: ChatSessionCreateRequest,
		options?: HealthRequestOptions,
	): Promise<ChatSessionRecord>;
	updateChatSession(
		sessionId: string,
		request: ChatSessionUpdateRequest,
		options?: HealthRequestOptions,
	): Promise<ChatSessionRecord>;
	listChatMessages(
		sessionId: string,
		options?: HealthRequestOptions,
	): Promise<ChatMessageRecord[]>;
	appendChatMessage(
		sessionId: string,
		request: ChatMessageCreateRequest,
		options?: HealthRequestOptions,
	): Promise<ChatMessageRecord>;
	sendChatMessage(
		sessionId: string,
		request: ChatSendRequest,
		options?: HealthRequestOptions,
	): Promise<ChatSendResponse>;
}
