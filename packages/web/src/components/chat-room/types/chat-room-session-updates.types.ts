import type { ChatSessionUpdateRequest } from "@/lib/api";

export interface ChatRoomSessionUpdateOptions {
	failureMessage: string;
	mutateSession: (input: {
		session: ChatSessionUpdateRequest;
		sessionId: string;
	}) => Promise<unknown>;
	selectedSessionId: string;
	session: ChatSessionUpdateRequest;
	sessionId: string;
	setActiveSessionId: (sessionId: string) => void;
	setErrorMessage: (message: string | null) => void;
}
