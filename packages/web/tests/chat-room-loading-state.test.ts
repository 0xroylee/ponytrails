import { describe, expect, it } from "bun:test";
import {
	resolveMinimumLoadingShellState,
	shouldShowChatRoomLoadingShell,
	shouldShowMissionProgressSkeleton,
} from "../src/components/chat-room/chat-room-loading-state";

describe("chat room loading state", () => {
	it("shows the loading shell only while selected session messages are fetching", () => {
		expect(
			shouldShowChatRoomLoadingShell({
				hasSelectedSession: true,
				hasMessagesCache: false,
				isMessagesLoading: true,
			}),
		).toBe(true);

		expect(
			shouldShowChatRoomLoadingShell({
				hasSelectedSession: false,
				hasMessagesCache: false,
				isMessagesLoading: true,
			}),
		).toBe(false);

		expect(
			shouldShowChatRoomLoadingShell({
				hasSelectedSession: true,
				hasMessagesCache: true,
				isMessagesLoading: true,
			}),
		).toBe(false);

		expect(
			shouldShowChatRoomLoadingShell({
				hasSelectedSession: true,
				hasMessagesCache: false,
				isMessagesLoading: false,
			}),
		).toBe(false);
		expect(
			shouldShowChatRoomLoadingShell({
				hasSelectedSession: false,
				hasMessagesCache: false,
				isMessagesLoading: false,
			}),
		).toBe(false);
	});

	it("shows the mission skeleton only when a loading chat has an active task", () => {
		expect(
			shouldShowMissionProgressSkeleton({
				hasActiveTask: true,
				isChatRoomLoading: true,
			}),
		).toBe(true);

		expect(
			shouldShowMissionProgressSkeleton({
				hasActiveTask: false,
				isChatRoomLoading: true,
			}),
		).toBe(false);

		expect(
			shouldShowMissionProgressSkeleton({
				hasActiveTask: true,
				isChatRoomLoading: false,
			}),
		).toBe(false);
	});

	it("hides the loading shell as soon as message querying stops", () => {
		expect(
			resolveMinimumLoadingShellState({
				isLoading: true,
				now: 1_000,
				visible: false,
				visibleSince: null,
			}),
		).toEqual({
			remainingMs: 0,
			visible: true,
			visibleSince: 1_000,
		});

		expect(
			resolveMinimumLoadingShellState({
				isLoading: false,
				now: 1_200,
				visible: true,
				visibleSince: 1_000,
			}),
		).toEqual({
			remainingMs: 0,
			visible: false,
			visibleSince: null,
		});

		expect(
			resolveMinimumLoadingShellState({
				isLoading: false,
				now: 3_000,
				visible: false,
				visibleSince: null,
			}),
		).toEqual({
			remainingMs: 0,
			visible: false,
			visibleSince: null,
		});
	});
});
