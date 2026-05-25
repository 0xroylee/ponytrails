"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

import {
	buildClarificationAnswers,
	resolveClarificationStep,
	updateClarificationAnswer,
} from "@/components/clarification/clarification-queue-utils";
import type { ChatSessionRecord } from "@/lib/api";
import type { ChatAnswerPayload } from "./types/chat-room.types";

interface UseChatClarificationStateInput {
	pendingAnswers: string[];
	pendingQuestionIndex: number;
	selectedSession: ChatSessionRecord | null;
	sendAnswers(input: {
		sessionId: string;
		content: string;
		answers: ChatAnswerPayload;
	}): Promise<void>;
}

interface ResolveClarificationAnswerInput {
	answerValue?: string;
	pendingAnswers: string[];
	pendingQuestionIndex: number;
	questions: ChatSessionRecord["pendingQuestions"];
}

export type ClarificationAnswerAction =
	| { kind: "none" }
	| {
			answerDrafts: string[];
			kind: "advance";
			nextQuestionIndex: number;
	  }
	| {
			answerDrafts: string[];
			answers: ChatAnswerPayload;
			content: string;
			kind: "submit";
	  };

export function useChatClarificationState(): {
	answerDrafts: Record<string, string[]>;
	answerStepBySession: Record<string, number>;
	setAnswerDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
	setAnswerStepBySession: Dispatch<SetStateAction<Record<string, number>>>;
	submitAnswerValue(
		input: UseChatClarificationStateInput & { answerValue: string },
	): Promise<void>;
	submitAnswers(input: UseChatClarificationStateInput): Promise<void>;
	updateAnswerDraft(sessionId: string, index: number, value: string): void;
} {
	const [answerDrafts, setAnswerDrafts] = useState<Record<string, string[]>>(
		{},
	);
	const [answerStepBySession, setAnswerStepBySession] = useState<
		Record<string, number>
	>({});

	function updateAnswerDraft(
		sessionId: string,
		index: number,
		value: string,
	): void {
		setAnswerDrafts((current) => ({
			...current,
			[sessionId]: updateClarificationAnswer(
				current[sessionId] ?? [],
				index,
				value,
			),
		}));
	}

	async function submitAnswerValue({
		answerValue,
		...input
	}: UseChatClarificationStateInput & { answerValue: string }): Promise<void> {
		await applyClarificationAction({
			...input,
			answerValue,
		});
	}

	async function submitAnswers({
		pendingAnswers,
		pendingQuestionIndex,
		selectedSession,
		sendAnswers,
	}: UseChatClarificationStateInput): Promise<void> {
		await applyClarificationAction({
			pendingAnswers,
			pendingQuestionIndex,
			selectedSession,
			sendAnswers,
		});
	}

	async function applyClarificationAction({
		answerValue,
		pendingAnswers,
		pendingQuestionIndex,
		selectedSession,
		sendAnswers,
	}: UseChatClarificationStateInput & {
		answerValue?: string;
	}): Promise<void> {
		if (!selectedSession?.pendingQuestions.length) return;
		const action = resolveClarificationAnswerAction({
			answerValue,
			pendingAnswers,
			pendingQuestionIndex,
			questions: selectedSession.pendingQuestions,
		});
		if (action.kind === "none") return;
		if (action.kind === "advance") {
			setAnswerDrafts((current) => ({
				...current,
				[selectedSession.id]: action.answerDrafts,
			}));
			setAnswerStepBySession((current) => ({
				...current,
				[selectedSession.id]: action.nextQuestionIndex,
			}));
			return;
		}
		await sendAnswers({
			sessionId: selectedSession.id,
			content: action.content,
			answers: action.answers,
		});
		setAnswerDrafts((current) => ({ ...current, [selectedSession.id]: [] }));
		setAnswerStepBySession((current) => ({
			...current,
			[selectedSession.id]: 0,
		}));
	}

	return {
		answerDrafts,
		answerStepBySession,
		setAnswerDrafts,
		setAnswerStepBySession,
		submitAnswerValue,
		submitAnswers,
		updateAnswerDraft,
	};
}

export function resolveClarificationAnswerAction({
	answerValue,
	pendingAnswers,
	pendingQuestionIndex,
	questions,
}: ResolveClarificationAnswerInput): ClarificationAnswerAction {
	const step = resolveClarificationStep(questions, pendingQuestionIndex);
	if (!step.currentQuestion) return { kind: "none" };
	const answerDrafts =
		answerValue === undefined
			? pendingAnswers
			: updateClarificationAnswer(
					pendingAnswers,
					step.currentIndex,
					answerValue,
				);
	if (!answerDrafts[step.currentIndex]?.trim()) return { kind: "none" };
	if (!step.isFinalStep) {
		return {
			answerDrafts,
			kind: "advance",
			nextQuestionIndex: step.currentIndex + 1,
		};
	}
	const answers = buildClarificationAnswers(questions, answerDrafts);
	return {
		answerDrafts,
		answers,
		content: answers.map((answer) => answer.answer).join("\n"),
		kind: "submit",
	};
}
