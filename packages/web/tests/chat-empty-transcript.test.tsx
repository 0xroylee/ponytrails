import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatTranscript } from "../src/components/chat-room/chat-transcript";
import type {
	ChatMessageRecord,
	ChatSessionRecord,
	WorkflowComputerRecord,
} from "../src/lib/api";
import { serverStateQueryKeys } from "../src/lib/api/queries";

describe("chat empty transcript daemon setup", () => {
	it("shows daemon setup commands under the logo when no computer is online", () => {
		const text = textContent(
			renderTranscript({
				computers: [workflowComputer({ status: "offline" })],
			}),
		);

		expect(text).toContain("DEVOS.ING");
		expect(text).toContain("npx devos onboard");
		expect(text).toContain("npx devos onboard --check");
		expect(text).toContain("devos daemon");
	});

	it("keeps the logo-only empty state when a computer is online", () => {
		const text = textContent(
			renderTranscript({
				computers: [workflowComputer({ status: "online" })],
			}),
		);

		expect(text).toContain("DEVOS.ING");
		expect(text).not.toContain("npx devos onboard");
		expect(text).not.toContain("devos daemon");
	});

	it("does not show daemon setup commands after chat messages exist", () => {
		const text = textContent(
			renderTranscript({
				computers: [],
				messages: [chatMessage({ content: "Chat before setup" })],
			}),
		);

		expect(text).toContain("Chat before setup");
		expect(text).not.toContain("npx devos onboard");
		expect(text).not.toContain("devos daemon");
	});
});

function renderTranscript({
	computers,
	messages = [],
}: {
	computers: WorkflowComputerRecord[];
	messages?: ChatMessageRecord[];
}): string {
	const queryClient = new QueryClient();
	queryClient.setQueryData(serverStateQueryKeys.workflowComputers, computers);
	return renderToStaticMarkup(
		createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(ChatTranscript, {
				error: null,
				isLoading: false,
				isThinking: false,
				missionProgress: null,
				messages,
				session: chatSession(),
				streamLines: [],
				workingStartedAt: null,
				onDraftCommand: () => undefined,
			}),
		),
	);
}

function workflowComputer(
	overrides: Partial<WorkflowComputerRecord> = {},
): WorkflowComputerRecord {
	return {
		id: "roys-macbook",
		name: "Roy's MacBook",
		hostname: "roys-macbook.local",
		platform: "darwin",
		arch: "arm64",
		cwd: "/repo",
		startedAt: "2026-05-24T00:00:00.000Z",
		workerId: "worker-1",
		status: "online",
		connectedAt: "2026-05-24T00:00:01.000Z",
		lastSeenAt: "2026-05-24T00:00:02.000Z",
		...overrides,
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
		taskId: null,
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
		taskId: null,
		title: "Untitled",
		pendingRequest: null,
		pendingQuestions: [],
		archived: false,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
	};
}

function textContent(html: string): string {
	return html.replace(/<[^>]*>/g, "");
}
