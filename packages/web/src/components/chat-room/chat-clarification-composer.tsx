"use client";

import type { KeyboardEvent, ReactElement } from "react";

import { resolveClarificationStep } from "@/components/clarification/clarification-queue-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ChatClarificationComposerProps } from "./types/chat-room.types";

export function ChatClarificationComposer({
	answers,
	disabled,
	pendingQuestionIndex,
	questions,
	onAnswerChange,
	onSelectOption,
	onSubmit,
}: ChatClarificationComposerProps): ReactElement | null {
	const step = resolveClarificationStep(questions, pendingQuestionIndex);
	const answer = answers[step.currentIndex] ?? "";
	const canSubmit = step.currentQuestion !== null && answer.trim().length > 0;

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key !== "Enter" || !canSubmit || disabled) {
			return;
		}
		event.preventDefault();
		onSubmit();
	}

	if (!step.currentQuestion) {
		return null;
	}

	return (
		<div className="px-4 py-3">
			<div className="mx-auto grid max-w-4xl gap-3 rounded-md border border-zinc-800 bg-[#17181c] p-3">
				<div className="grid gap-2 text-sm">
					<span
						className="text-zinc-300"
						id={`clarification-composer-question-${step.currentIndex}`}
					>
						{step.currentQuestion.question}
					</span>
					{step.currentQuestion.options?.length ? (
						<div className="flex flex-wrap gap-2">
							{step.currentQuestion.options.map((option) => (
								<Button
									disabled={disabled}
									key={option.value}
									onClick={() =>
										onSelectOption(step.currentIndex, option.value)
									}
									size="sm"
									type="button"
									variant={answer === option.value ? "default" : "secondary"}
								>
									<span>{option.label}</span>
									{option.recommended ? (
										<span className="rounded-sm border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-200">
											Recommended
										</span>
									) : null}
								</Button>
							))}
						</div>
					) : null}
					<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
						<Input
							aria-labelledby={`clarification-composer-question-${step.currentIndex}`}
							disabled={disabled}
							id={`clarification-composer-answer-${step.currentIndex}`}
							onChange={(event) =>
								onAnswerChange(step.currentIndex, event.target.value)
							}
							onKeyDown={handleKeyDown}
							placeholder="Type a custom answer"
							value={answer}
						/>
						<Button
							disabled={disabled || !canSubmit}
							onClick={onSubmit}
							type="button"
						>
							{step.isFinalStep ? "Submit" : "Next"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
