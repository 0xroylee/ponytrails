import type { ChatSessionRecord, ChatSessionUpdateRequest } from "@/lib/api";

export function createChatSessionTitleRenameHandler({
	renameSession,
	selectedSession,
	showError,
}: {
	renameSession: (input: {
		sessionId: string;
		session: ChatSessionUpdateRequest;
	}) => Promise<unknown>;
	selectedSession: ChatSessionRecord | null;
	showError: (message: string) => void;
}): (title: string) => Promise<boolean> {
	return async (title) => {
		const nextTitle = title.trim();
		if (!selectedSession || !nextTitle) {
			return false;
		}
		if (nextTitle === selectedSession.title.trim()) {
			return true;
		}
		try {
			await renameSession({
				sessionId: selectedSession.id,
				session: { title: nextTitle },
			});
			return true;
		} catch (error) {
			showError(error instanceof Error ? error.message : "Rename failed");
			return false;
		}
	};
}
