import type { ChatSessionRecord } from "./types/chat.types";

export function compareChatSessions(
	left: ChatSessionRecord,
	right: ChatSessionRecord,
): number {
	if (left.pinned !== right.pinned) {
		return left.pinned ? -1 : 1;
	}
	return right.updatedAt.localeCompare(left.updatedAt);
}
