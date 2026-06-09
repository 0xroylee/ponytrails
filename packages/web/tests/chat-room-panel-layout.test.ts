import { describe, expect, it } from "bun:test";

import { resolveChatRoomPanelLayout } from "../src/components/chat-room/chat-room-panel-layout";

describe("chat room panel layout", () => {
	it("keeps task details in the main content slot instead of a right column", () => {
		const layout = resolveChatRoomPanelLayout({
			activeContentMode: "taskDetails",
			hasActiveTask: true,
		});

		expect(layout.contentMode).toBe("taskDetails");
		expect(layout.rootClassName).not.toContain("grid-cols");
		expect(layout.sessionClassName).toContain("grid-rows-[auto_minmax(0,1fr)]");
	});

	it("falls back to messages when task details is requested without a task", () => {
		expect(
			resolveChatRoomPanelLayout({
				activeContentMode: "taskDetails",
				hasActiveTask: false,
			}).contentMode,
		).toBe("messages");
	});

	it("does not show the mission panel inside the messages tab", () => {
		const layout = resolveChatRoomPanelLayout({
			activeContentMode: "messages",
			hasActiveTask: true,
		});

		expect(layout.contentMode).toBe("messages");
		expect(layout.showMissionPanelInTranscript).toBe(false);
	});

	it("uses the main content slot for action status", () => {
		const layout = resolveChatRoomPanelLayout({
			activeContentMode: "action",
			hasActiveTask: true,
		});

		expect(layout.contentMode).toBe("action");
		expect(layout.rootClassName).not.toContain("grid-cols");
		expect(layout.sessionClassName).toContain("grid-rows-[auto_minmax(0,1fr)]");
	});

	it("uses one content width across session tabs", () => {
		const contentWidths = [
			resolveChatRoomPanelLayout({
				activeContentMode: "messages",
				hasActiveTask: true,
			}).contentWidthClassName,
			resolveChatRoomPanelLayout({
				activeContentMode: "taskDetails",
				hasActiveTask: true,
			}).contentWidthClassName,
			resolveChatRoomPanelLayout({
				activeContentMode: "action",
				hasActiveTask: true,
			}).contentWidthClassName,
		];

		expect(new Set(contentWidths)).toEqual(new Set(["max-w-5xl"]));
	});
});
