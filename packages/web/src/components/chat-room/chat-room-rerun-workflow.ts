import type { CliCommandStreamEvent, CliCommandStreamRequest } from "@/lib/api";
import type { Dispatch, SetStateAction } from "react";
import {
	createStreamLine,
	streamLineFromCommandEvent,
} from "./chat-command-stream-lines";
import type { ChatStreamLine } from "./types/chat-room.types";

export async function rerunChatSessionWorkflow({
	command,
	refetchActiveTask,
	refetchMessages,
	refetchSessions,
	setCommandLines,
	setIsRerunning,
	setSubmittedRerunKey,
	streamCliCommand,
	submissionKey,
	showError,
}: {
	command: CliCommandStreamRequest;
	refetchActiveTask: () => Promise<unknown>;
	refetchMessages: () => Promise<unknown>;
	refetchSessions: () => Promise<unknown>;
	setCommandLines: Dispatch<SetStateAction<ChatStreamLine[]>>;
	setIsRerunning: (value: boolean) => void;
	setSubmittedRerunKey: (value: string) => void;
	streamCliCommand: (
		command: CliCommandStreamRequest,
		onEvent: (event: CliCommandStreamEvent) => void,
	) => Promise<unknown>;
	submissionKey: string;
	showError: (message: string) => void;
}): Promise<void> {
	let finalStatus: "succeeded" | "failed" | "rejected" | null = null;
	let finalError: string | undefined;
	setIsRerunning(true);
	setSubmittedRerunKey(submissionKey);
	setCommandLines([createStreamLine("system", "Queued workflow rerun.")]);
	try {
		await streamCliCommand(command, (event) => {
			if (event.type === "complete") {
				finalStatus = event.result.status;
				finalError = event.result.error;
			}
			const line = streamLineFromCommandEvent(event);
			if (line) setCommandLines((current) => [...current, line]);
		});
		await Promise.allSettled([
			refetchSessions(),
			refetchMessages(),
			refetchActiveTask(),
		]);
		if (finalStatus && finalStatus !== "succeeded") {
			showError(finalError ?? "Workflow rerun failed.");
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Workflow rerun failed.";
		setCommandLines((current) => [
			...current,
			createStreamLine("stderr", message),
		]);
		showError(message);
	} finally {
		setIsRerunning(false);
	}
}
