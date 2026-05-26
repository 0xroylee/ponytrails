import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	createChatMissionProgressModel,
	isActiveMissionStatus,
} from "../src/components/chat-room/chat-mission-progress-state";
import { ChatTranscript } from "../src/components/chat-room/chat-transcript";
import type { ChatMissionProgressViewModel } from "../src/components/chat-room/types/chat-mission-progress.types";
import type {
	ChatMessageRecord,
	ChatSessionRecord,
	ProjectBoardTaskRecord,
	TaskActivityRecord,
} from "../src/lib/api";

describe("chat mission progress", () => {
	it("renders mission progress after chat history", () => {
		const mission = missionModel();
		const html = renderTranscript({
			messages: [chatMessage({ content: "Chat before mission" })],
			missionProgress: mission,
		});

		expect(html).toContain('data-chat-mission-progress="true"');
		expect(textContent(html)).toContain("Mission");
		expect(textContent(html)).toContain("TASK-42");
		expect(html.indexOf("Chat before mission")).toBeLessThan(
			html.indexOf('data-chat-mission-progress="true"'),
		);

		const emptyHtml = renderTranscript({ missionProgress: null });
		expect(emptyHtml).not.toContain('data-chat-mission-progress="true"');
	});

	it("shows the DEVOS.ING logo instead of an empty task prompt", () => {
		const html = renderTranscript({ missionProgress: null });
		const text = textContent(html);

		expect(text).toContain("DEVOS.ING");
		expect(text).not.toContain("Untitled");
		expect(text).not.toContain("Ready for a task.");
	});

	it("treats only active workflow statuses as mission-visible", () => {
		expect(isActiveMissionStatus("backlog")).toBe(false);
		expect(isActiveMissionStatus("plan")).toBe(false);
		expect(isActiveMissionStatus("done")).toBe(false);
		expect(isActiveMissionStatus("blocked")).toBe(false);
		expect(isActiveMissionStatus("implementing")).toBe(true);
		expect(isActiveMissionStatus("reviewing")).toBe(true);
		expect(isActiveMissionStatus("testing")).toBe(true);
	});

	it("maps task activity into status, notes, logs, steps, and result", () => {
		const mission = missionModel();

		expect(mission.statusLabel).toBe("Implementing");
		expect(mission.notes[0]?.body).toContain("changed status");
		expect(mission.executions[0]?.logLines).toEqual([
			expect.objectContaining({ stream: "stdout", text: "Planning complete" }),
			expect.objectContaining({ stream: "stderr", text: "Needs retry" }),
		]);
		expect(mission.latestResult).toEqual({
			label: "succeeded",
			tone: "success",
		});

		const html = renderTranscript({ missionProgress: mission });
		const text = textContent(html);
		expect(text).toContain("Implementing");
		expect(html).toContain('data-mission-section="status"');
		expect(html).toContain('data-mission-section="plan-updates"');
		expect(html).toContain('data-mission-section="progress-steps"');
		expect(html).toContain('data-mission-section="execution-logs"');
		expect(html).toContain('data-mission-section="result"');
		expect(html).toContain("Plan &amp; updates");
		expect(text).toContain("Progress steps");
		expect(text).toContain("Execution logs");
		expect(text).not.toContain("Progress logs");
		expect(text).toContain("changed status from `plan` to `implementing`");
		expect(text).toContain("implementation succeeded");
		expect(text).toContain("Planning complete");
		expect(text).toContain("Needs retry");
		expect(text).toContain("Result: succeeded");
	});

	it("renders blocked mission results as warning instead of success", () => {
		const mission = missionModel("blocked");

		expect(mission.latestResult).toEqual({
			label: "blocked",
			tone: "warning",
		});

		const html = renderTranscript({ missionProgress: mission });
		expect(html).toContain('data-mission-section="result"');
		expect(html).toContain("text-amber-300");
		expect(html).not.toContain("text-emerald-300");
	});
});

function renderTranscript({
	messages = [],
	missionProgress,
}: {
	messages?: ChatMessageRecord[];
	missionProgress: ChatMissionProgressViewModel | null;
}): string {
	const queryClient = new QueryClient();
	return renderToStaticMarkup(
		createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(ChatTranscript, {
				error: null,
				isLoading: false,
				isThinking: false,
				missionProgress,
				messages,
				session: chatSession(),
				streamLines: [],
				workingStartedAt: null,
				onDraftCommand: () => undefined,
			}),
		),
	);
}

function missionModel(status = "succeeded"): ChatMissionProgressViewModel {
	return createChatMissionProgressModel({
		task: boardTask(),
		activity: {
			taskId: "task-42",
			activities: [statusComment(), executionActivity(status)],
		},
	});
}

function statusComment(): TaskActivityRecord {
	return {
		id: "comment-1",
		kind: "comment",
		actorId: "system",
		actorType: "system",
		title: "updated this issue",
		body: "changed status from `plan` to `implementing`",
		status: null,
		createdAt: "2026-05-20T00:01:00.000Z",
	};
}

function executionActivity(status: string): TaskActivityRecord {
	return {
		id: "exec-1",
		kind: "execution",
		actorId: "devos",
		actorType: "agent",
		title: "recorded execution output",
		body: [
			"[2026-05-20T00:02:00.000Z stdout] Planning complete",
			"[2026-05-20T00:02:01.000Z stderr] Needs retry",
		].join("\n"),
		status,
		createdAt: "2026-05-20T00:02:00.000Z",
		steps: [
			{
				id: "step-1",
				stepNumber: 1,
				action: "implementation",
				status: "succeeded",
				detail: JSON.stringify({ message: "implementation succeeded" }),
				recordedAt: "2026-05-20T00:02:30.000Z",
			},
		],
	};
}

function boardTask(): ProjectBoardTaskRecord {
	return {
		id: "task-42",
		taskKey: "TASK-42",
		projectId: "project-1",
		title: "Show mission progress",
		content: "Display progress in the chat transcript.",
		priority: 2,
		status: "implementing",
		dueDate: null,
		creatorId: "owner-1",
		assigneeId: null,
		linkedPr: null,
		linearIssueId: null,
		linearIdentifier: null,
		linearUrl: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:03:00.000Z",
	};
}

function chatMessage(
	overrides: Partial<ChatMessageRecord> = {},
): ChatMessageRecord {
	return {
		id: "message-1",
		sessionId: "session-1",
		role: "user",
		kind: "message",
		content: "Message",
		taskId: "task-42",
		commandAction: null,
		metadata: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}

function chatSession(): ChatSessionRecord {
	return {
		id: "session-1",
		workspaceId: "owner-1",
		projectId: "default",
		taskId: "task-42",
		title: "Untitled",
		pendingRequest: null,
		pendingQuestions: [],
		archived: false,
		pinned: false,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
	};
}

function textContent(html: string): string {
	return html.replace(/<[^>]*>/g, "");
}
