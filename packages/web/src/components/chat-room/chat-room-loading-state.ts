export function shouldShowChatRoomLoadingShell({
	hasMessagesCache,
	hasSelectedSession,
	isMessagesLoading,
}: {
	hasMessagesCache: boolean;
	hasSelectedSession: boolean;
	isMessagesLoading: boolean;
}): boolean {
	return hasSelectedSession && isMessagesLoading && !hasMessagesCache;
}

export function resolveMinimumLoadingShellState({
	isLoading,
	now,
	visible,
	visibleSince,
}: {
	isLoading: boolean;
	now: number;
	visible: boolean;
	visibleSince: number | null;
}): { remainingMs: number; visible: boolean; visibleSince: number | null } {
	if (isLoading) {
		return {
			remainingMs: 0,
			visible: true,
			visibleSince: visible ? (visibleSince ?? now) : now,
		};
	}
	return { remainingMs: 0, visible: false, visibleSince: null };
}

export function shouldShowMissionProgressSkeleton({
	hasActiveTask,
	isChatRoomLoading,
}: {
	hasActiveTask: boolean;
	isChatRoomLoading: boolean;
}): boolean {
	return isChatRoomLoading && hasActiveTask;
}
