import type { ChatSessionRecord } from "@/lib/api";

import type { useChatClarificationState } from "./chat-clarification-state";
import type { ChatAnswerPayload } from "./types/chat-room.types";

interface CreateChatClarificationSubmittersInput {
	clarificationState: ReturnType<typeof useChatClarificationState>;
	pendingAnswers: string[];
	pendingQuestionIndex: number;
	runWithWorkingLabel<T>(work: () => Promise<T>): Promise<T>;
	selectedSession: ChatSessionRecord | null;
	sendMessage(input: {
		message: { answers?: ChatAnswerPayload; content: string };
		sessionId: string;
	}): Promise<unknown>;
}

export function createChatClarificationSubmitters({
	clarificationState,
	pendingAnswers,
	pendingQuestionIndex,
	runWithWorkingLabel,
	selectedSession,
	sendMessage,
}: CreateChatClarificationSubmittersInput): {
	submitAnswerValue(index: number, value: string): Promise<void>;
	submitAnswers(): Promise<void>;
} {
	function sendAnswers({
		sessionId,
		content,
		answers,
	}: {
		sessionId: string;
		content: string;
		answers: ChatAnswerPayload;
	}): Promise<void> {
		return sendMessage({ sessionId, message: { content, answers } }).then(
			() => undefined,
		);
	}

	return {
		submitAnswers: () =>
			runWithWorkingLabel(() =>
				clarificationState.submitAnswers({
					pendingAnswers,
					pendingQuestionIndex,
					selectedSession,
					sendAnswers,
				}),
			),
		submitAnswerValue: (index, value) =>
			runWithWorkingLabel(() =>
				clarificationState.submitAnswerValue({
					answerValue: value,
					pendingAnswers,
					pendingQuestionIndex: index,
					selectedSession,
					sendAnswers,
				}),
			),
	};
}
