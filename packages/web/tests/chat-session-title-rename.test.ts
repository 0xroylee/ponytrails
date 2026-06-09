import { describe, expect, it } from "bun:test";
import { createChatSessionTitleRenameHandler } from "../src/components/chat-room/chat-session-title-rename";
import type { ChatSessionRecord } from "../src/lib/api";

describe("chat session title rename", () => {
	it("trims changed titles before updating the session", async () => {
		const updates: unknown[] = [];
		const renameTitle = createChatSessionTitleRenameHandler({
			renameSession: async (input) => {
				updates.push(input);
			},
			selectedSession: chatSession({ title: "Untitled" }),
			showError: () => {},
		});

		await expect(renameTitle(" Renamed ")).resolves.toBe(true);

		expect(updates).toEqual([
			{
				sessionId: "session-1",
				session: { title: "Renamed" },
			},
		]);
	});

	it("skips empty and unchanged titles", async () => {
		const updates: unknown[] = [];
		const renameTitle = createChatSessionTitleRenameHandler({
			renameSession: async (input) => {
				updates.push(input);
			},
			selectedSession: chatSession({ title: "Untitled" }),
			showError: () => {},
		});

		await expect(renameTitle("   ")).resolves.toBe(false);
		await expect(renameTitle(" Untitled ")).resolves.toBe(true);

		expect(updates).toEqual([]);
	});

	it("keeps edit mode open when the update fails", async () => {
		const errors: string[] = [];
		const renameTitle = createChatSessionTitleRenameHandler({
			renameSession: async () => {
				throw new Error("Network failed");
			},
			selectedSession: chatSession({ title: "Untitled" }),
			showError: (message) => errors.push(message),
		});

		await expect(renameTitle("Renamed")).resolves.toBe(false);

		expect(errors).toEqual(["Network failed"]);
	});
});

function chatSession(
	overrides: Partial<ChatSessionRecord> = {},
): ChatSessionRecord {
	return {
		id: "session-1",
		workspaceId: "owner-1",
		projectId: "default",
		taskId: "task-1",
		title: "Untitled",
		pendingRequest: null,
		pendingQuestions: [],
		archived: false,
		workflowState: null,
		createdAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
		lastSeenAt: "2026-05-16T00:00:00.000Z",
		...overrides,
	};
}
