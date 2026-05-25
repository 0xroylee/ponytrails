import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatClarificationComposer } from "../src/components/chat-room/chat-clarification-composer";
import { resolveClarificationAnswerAction } from "../src/components/chat-room/chat-clarification-state";
import { ChatRoomPanelView } from "../src/components/chat-room/chat-room-panel-view";
import type { ChatSessionRecord } from "../src/lib/api";

describe("chat clarification composer", () => {
	it("renders clarification controls in the composer slot shape", () => {
		const html = renderToStaticMarkup(
			createElement(ChatClarificationComposer, {
				answers: [],
				disabled: false,
				pendingQuestionIndex: 0,
				questions: [
					{
						question: "Which agent?",
						options: [
							{ label: "Codex", value: "codex", recommended: true },
							{ label: "Claude", value: "claude" },
						],
					},
				],
				onAnswerChange: () => undefined,
				onSelectOption: () => undefined,
				onSubmit: () => undefined,
			}),
		);

		expect(html).toContain("Which agent?");
		expect(html).toContain("Codex");
		expect(html).toContain("Recommended");
		expect(html).toContain("Type a custom answer");
		expect(html).toContain("Submit");
		expect(html).not.toContain('value="codex"');
		expect(html).not.toContain("Message or /command");
	});

	it("renders next for non-final clarification steps", () => {
		const html = renderToStaticMarkup(
			createElement(ChatClarificationComposer, {
				answers: ["codex"],
				disabled: false,
				pendingQuestionIndex: 0,
				questions: [{ question: "Which agent?" }, { question: "What scope?" }],
				onAnswerChange: () => undefined,
				onSelectOption: () => undefined,
				onSubmit: () => undefined,
			}),
		);

		expect(html).toContain("Which agent?");
		expect(html).toContain("Next");
		expect(html).not.toContain("What scope?");
	});

	it("resolves option clicks as immediate advance or submit actions", () => {
		const questions = [
			{
				question: "Which agent?",
				options: [{ label: "Codex", value: "codex" }],
			},
			{
				question: "What scope?",
				options: [{ label: "Web", value: "web" }],
			},
		];

		expect(
			resolveClarificationAnswerAction({
				answerValue: "codex",
				pendingAnswers: [],
				pendingQuestionIndex: 0,
				questions,
			}),
		).toEqual({
			answerDrafts: ["codex"],
			kind: "advance",
			nextQuestionIndex: 1,
		});
		expect(
			resolveClarificationAnswerAction({
				answerValue: "web",
				pendingAnswers: ["codex"],
				pendingQuestionIndex: 1,
				questions,
			}),
		).toEqual({
			answerDrafts: ["codex", "web"],
			answers: [
				{ question: "Which agent?", answer: "codex" },
				{ question: "What scope?", answer: "web" },
			],
			content: "codex\nweb",
			kind: "submit",
		});
	});

	it("replaces the normal composer in the chat panel footer", () => {
		const session = chatSession({
			pendingQuestions: [{ question: "Implement this plan?" }],
		});
		const queryClient = new QueryClient();
		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatRoomPanelView, {
					activeSessionId: session.id,
					activeTaskId: null,
					draft: "",
					errorMessage: null,
					isBusy: false,
					isCreatingSession: false,
					isMessagesLoading: false,
					isSending: false,
					isTaskDetailSheetOpen: false,
					isThinking: false,
					messages: [],
					messagesError: null,
					pendingAnswers: [],
					pendingQuestionIndex: 0,
					projects: [],
					selectedSession: session,
					sidebarControlId: "chat-sidebar-toggle-test",
					sidebarToggleRef: createRef<HTMLInputElement>(),
					sessions: [session],
					streamLines: [],
					onAnswerChange: () => undefined,
					onArchiveSession: () => undefined,
					onCloseSidebar: () => undefined,
					onCloseTaskDetails: () => undefined,
					onDraftChange: () => undefined,
					onNewSession: () => undefined,
					onOpenTaskDetails: () => undefined,
					onSearch: () => undefined,
					onSelectCommand: () => undefined,
					onSelectOption: () => undefined,
					onSelectSession: () => undefined,
					onSubmit: () => undefined,
					onSubmitAnswers: () => undefined,
				}),
			),
		);

		expect(html).toContain("Implement this plan?");
		expect(html).toContain("Type a custom answer");
		expect(html).not.toContain("Message or /command");
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
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}
