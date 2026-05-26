import type { ChatRoomSessionUpdateOptions } from "./types/chat-room-session-updates.types";

export async function updateChatRoomSessionState(
	options: ChatRoomSessionUpdateOptions,
): Promise<void> {
	options.setErrorMessage(null);
	try {
		await options.mutateSession({
			sessionId: options.sessionId,
			session: options.session,
		});
		if (
			options.session.archived &&
			options.sessionId === options.selectedSessionId
		) {
			options.setActiveSessionId("");
		}
	} catch (error) {
		options.setErrorMessage(
			error instanceof Error ? error.message : options.failureMessage,
		);
	}
}
