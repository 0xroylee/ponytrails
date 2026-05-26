import type { ChatSessionRecord } from "@/lib/api";

export interface ChatRoomSessionRowProps {
	activeSessionId: string;
	session: ChatSessionRecord;
	onArchiveSession: (sessionId: string) => void;
	onPinSession: (sessionId: string, pinned: boolean) => void;
	onSelectSession: (sessionId: string) => void;
}
