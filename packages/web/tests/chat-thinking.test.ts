import { describe, expect, it } from "bun:test";
import { shouldShowChatThinkingIndicator } from "../src/components/chat-room/chat-thinking-state";

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
		expect(
			shouldShowChatThinkingIndicator({
				isSending: false,
				selectedSessionId: "session-1",
				sendingSessionId: "session-1",
				streamLineCount: 0,
			}),
		).toBe(false);
		expect(
			shouldShowChatThinkingIndicator({
				isSending: true,
				selectedSessionId: "",
				sendingSessionId: "session-1",
				streamLineCount: 0,
			}),
		).toBe(false);
	});
});
