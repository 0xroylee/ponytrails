import type { ChatSendStreamCallbacks } from "../../chat";

export interface ChatSendRouteMessageInput {
	content: string;
	answers?: Array<{ question: string; answer: string }>;
}

export interface ChatSendRouteService {
	queueMessage(
		sessionId: string,
		input: ChatSendRouteMessageInput,
		stream?: ChatSendStreamCallbacks,
	): Promise<unknown>;
}
