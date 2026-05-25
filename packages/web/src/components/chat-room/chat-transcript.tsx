"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";

import { TextShimmer } from "@/components/loading/text-shimmer";
import type { ChatMessageRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { resolveChatMessageDisplay } from "./chat-message-display";
import type { ChatTranscriptProps } from "./types/chat-room.types";

export function ChatTranscript({
	error,
	isLoading,
	isThinking,
	messages,
	session,
	streamLines,
	workingStartedAt,
}: ChatTranscriptProps): ReactElement {
	const pendingQuestions = session?.pendingQuestions ?? [];
	const hasPendingQuestions = pendingQuestions.length > 0;
	const showThinking =
		isThinking && !hasPendingQuestions && streamLines.length === 0;
	const showWorkingHeader =
		Boolean(workingStartedAt) && (showThinking || streamLines.length > 0);
	return (
		<div className="min-h-0 overflow-auto px-4 py-6">
			<div className="mx-auto grid max-w-4xl gap-4">
				{isLoading ? <StatusLine text="Loading session..." /> : null}
				{error ? <ErrorLine text={error.message} /> : null}
				{!isLoading && messages.length === 0 ? (
					<div className="pt-[18dvh] text-center text-zinc-500">
						<h1 className="mb-2 text-2xl font-semibold text-zinc-100">
							{session?.title ?? "Untitled"}
						</h1>
						<p className="m-0 text-sm">Ready for a task.</p>
					</div>
				) : null}
				{messages.map((message) => (
					<ChatMessageBubble key={message.id} message={message} />
				))}
				{showWorkingHeader ? (
					<WorkingSectionHeader startedAt={workingStartedAt ?? ""} />
				) : null}
				{showThinking ? <ThinkingLine /> : null}
				{streamLines.length > 0 ? (
					<div className="justify-self-start whitespace-pre-wrap rounded-md border border-zinc-800 bg-[#17181c] px-3 py-2 font-mono text-xs text-zinc-300">
						{streamLines.map((line) => (
							<div
								className={line.stream === "stderr" ? "text-red-200" : ""}
								key={line.id}
							>
								{line.text}
							</div>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}

function WorkingSectionHeader({
	startedAt,
}: {
	startedAt: string;
}): ReactElement {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div className="grid gap-4 pt-2">
			<p className="m-0 text-lg font-medium text-zinc-500">
				Working for {formatElapsedSeconds(startedAt, now)}s
			</p>
			<div className="h-px bg-zinc-800" />
		</div>
	);
}

function formatElapsedSeconds(startedAt: string, now: number): number {
	const startedTime = new Date(startedAt).getTime();
	if (!Number.isFinite(startedTime)) {
		return 1;
	}
	return Math.max(1, Math.floor((now - startedTime) / 1000));
}

function ThinkingLine(): ReactElement {
	return <TextShimmer>Thinking...</TextShimmer>;
}

function ChatMessageBubble({
	message,
}: {
	message: ChatMessageRecord;
}): ReactElement {
	const isUser = message.role === "user";
	const display = resolveChatMessageDisplay(message);
	if (display === "assistant-note") {
		return <AssistantNote message={message} />;
	}
	if (display === "plan") {
		return <PlanMessage message={message} />;
	}
	const isError = display === "error";
	return (
		<article
			data-chat-message-display={display}
			className={cn(
				"grid max-w-[min(42rem,90%)] gap-2 rounded-md border px-3 py-2 text-sm",
				isUser
					? "justify-self-end border-zinc-700 bg-zinc-800 text-zinc-100"
					: "justify-self-start border-zinc-800 bg-[#17181c] text-zinc-200",
				isError && "border-red-900/60 bg-red-950/30 text-red-100",
			)}
		>
			{/* <div className="flex items-center gap-2 text-xs text-zinc-500">
				{message.kind === "task" ? <CheckCircle2 size={14} /> : null}
				{isError ? <CircleAlert size={14} /> : null}
			</div> */}
			<p className="m-0 whitespace-pre-wrap leading-6">{message.content}</p>
		</article>
	);
}

function AssistantNote({
	message,
}: {
	message: ChatMessageRecord;
}): ReactElement {
	return (
		<article
			className="grid max-w-[min(42rem,90%)] justify-self-start gap-2 px-1 py-1 text-sm text-zinc-300"
			data-chat-message-display="assistant-note"
		>
			<p className="m-0 whitespace-pre-wrap leading-6">{message.content}</p>
		</article>
	);
}

function PlanMessage({
	message,
}: {
	message: ChatMessageRecord;
}): ReactElement {
	return (
		<article
			className="grid max-w-[min(46rem,94%)] justify-self-start gap-2 rounded-md border border-blue-900/50 bg-[#121722] px-3 py-2 text-sm text-zinc-200"
			data-chat-message-display="plan"
		>
			<div className="text-xs font-medium uppercase text-blue-300">Plan</div>
			<p className="m-0 whitespace-pre-wrap leading-6">{message.content}</p>
		</article>
	);
}

function StatusLine({ text }: { text: string }): ReactElement {
	return <p className="m-0 text-sm text-zinc-500">{text}</p>;
}

function ErrorLine({ text }: { text: string }): ReactElement {
	return (
		<p className="m-0 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-100">
			{text}
		</p>
	);
}
