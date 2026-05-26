import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { shouldShowChatThinkingIndicator } from "../src/components/chat-room/chat-thinking-state";
import { ChatTranscript } from "../src/components/chat-room/chat-transcript";
import { TextShimmer } from "../src/components/loading/text-shimmer";
import type { ChatMessageRecord, ChatSessionRecord } from "../src/lib/api";
import { chatMessage, chatSession } from "./helpers/chat-records";

describe("chat thinking indicator", () => {
	it("shows only for a pending send on the active session without output", () => {
		expect(
			shouldShowChatThinkingIndicator({
				isSending: true,
				selectedSessionId: "session-1",
				sendingSessionId: "session-1",
				streamLineCount: 0,
			}),
		).toBe(true);
		expect(
			shouldShowChatThinkingIndicator({
				isSending: true,
				selectedSessionId: "session-1",
				sendingSessionId: "session-2",
				streamLineCount: 0,
			}),
		).toBe(false);
		expect(
			shouldShowChatThinkingIndicator({
				isSending: true,
				selectedSessionId: "session-1",
				sendingSessionId: "session-1",
				streamLineCount: 1,
			}),
		).toBe(false);
	});

	it("renders shimmer text for thinking and suppresses it when streams exist", () => {
		const html = renderTranscript({
			isThinking: true,
			streamLines: [],
			workingStartedAt: activeStartedAt(),
		});
		expect(textContent(html)).toContain("Working for");
		expect(textContent(html)).toContain("Thinking...");
		expect(html).toContain("<span");
		expect(html).toContain("--shimmering-color");

		const answeringClarificationHtml = renderTranscript({
			isThinking: true,
			session: chatSession({
				pendingQuestions: [{ question: "Which agent?" }],
			}),
			streamLines: [],
			workingStartedAt: activeStartedAt(),
		});
		expect(textContent(answeringClarificationHtml)).toContain("Thinking...");

		const idleHtml = renderTranscript({ isThinking: false, streamLines: [] });
		expect(idleHtml).not.toContain("Working for");
		expect(idleHtml).not.toContain("Thinking...");

		const streamingHtml = renderTranscript({
			isThinking: true,
			streamLines: [{ id: "run-1", stream: "system", text: "Ran 7 commands" }],
			workingStartedAt: activeStartedAt(),
		});
		expect(textContent(streamingHtml)).toContain("Working for");
		expect(streamingHtml).not.toContain("Thinking...");
		expect(streamingHtml.indexOf("Working for")).toBeLessThan(
			streamingHtml.indexOf("Ran 7 commands"),
		);
		expect(streamingHtml).toContain("Ran 7 commands");

		const staleStreamHtml = renderTranscript({
			isThinking: false,
			streamLines: [{ id: "run-2", stream: "system", text: "Previous output" }],
		});
		expect(staleStreamHtml).not.toContain("Working for");
		expect(staleStreamHtml).toContain("Previous output");
	});

	it("renders reusable shimmer content", () => {
		const html = renderToStaticMarkup(
			createElement(TextShimmer, null, "Loading"),
		);
		expect(textContent(html)).toContain("Loading");
		expect(html).toContain("--shimmering-color");
	});

	it("keeps pending clarification controls out of the transcript", () => {
		const queryClient = new QueryClient();
		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatTranscript, {
					error: null,
					isLoading: false,
					isThinking: false,
					missionProgress: null,
					messages: [],
					session: chatSession({
						pendingQuestions: [
							{
								question: "Which agent?",
								options: [
									{ label: "Codex", value: "codex" },
									{ label: "Claude", value: "claude" },
								],
							},
							{ question: "What scope?" },
						],
					}),
					streamLines: [],
					workingStartedAt: null,
					onDraftCommand: () => undefined,
				}),
			),
		);

		expect(html).not.toContain("What scope?");
		expect(html).not.toContain("Which agent?");
		expect(html).not.toContain("Type a custom answer");
	});

	it("renders assistant notes plainly and plan-shaped content in a box", () => {
		const noteHtml = renderTranscript({
			isThinking: false,
			messages: [
				chatMessage({
					content: "I need a bit more detail before planning.",
					role: "assistant",
				}),
			],
			streamLines: [],
		});
		expect(noteHtml).toContain('data-chat-message-display="assistant-note"');
		expect(noteHtml).not.toContain("border-border bg-surface-panel");

		const planHtml = renderTranscript({
			isThinking: false,
			messages: [
				chatMessage({
					content: [
						"Title",
						"Ship the workflow",
						"Summary",
						"Make the behavior clear.",
						"Test plan",
						"Run the focused tests.",
					].join("\n"),
					role: "assistant",
				}),
			],
			streamLines: [],
		});
		expect(planHtml).toContain('data-chat-message-display="plan"');
		expect(planHtml).toContain("Plan");
		expect(planHtml).toContain("border-blue-900");
	});

	it("keeps user and error messages boxed", () => {
		const html = renderTranscript({
			isThinking: false,
			messages: [
				chatMessage({ content: "Please do the thing", role: "user" }),
				chatMessage({
					content: "Something failed",
					kind: "error",
					role: "system",
				}),
			],
			streamLines: [],
		});

		expect(html).toContain('data-chat-message-display="standard"');
		expect(html).toContain('data-chat-message-display="error"');
		expect(html).toContain(
			"justify-self-end border-zinc-700 bg-surface-active",
		);
		expect(html).toContain("border-red-900");
	});
});

function renderTranscript({
	isThinking,
	messages = [],
	session = chatSession(),
	streamLines,
	workingStartedAt = null,
}: {
	isThinking: boolean;
	messages?: ChatMessageRecord[];
	session?: ChatSessionRecord;
	streamLines: Array<{
		id: string;
		stream: "stdout" | "stderr" | "system";
		text: string;
	}>;
	workingStartedAt?: string | null;
}): string {
	const queryClient = new QueryClient();
	return renderToStaticMarkup(
		createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(ChatTranscript, {
				error: null,
				isLoading: false,
				isThinking,
				missionProgress: null,
				messages,
				session,
				streamLines,
				workingStartedAt,
				onDraftCommand: () => undefined,
			}),
		),
	);
}

function activeStartedAt(): string {
	return new Date(Date.now() - 13_000).toISOString();
}

function textContent(html: string): string {
	return html.replace(/<[^>]*>/g, "");
}
