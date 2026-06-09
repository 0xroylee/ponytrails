import type { CliCommandStreamEvent } from "@/lib/api";
import type { ChatStreamLine } from "./types/chat-room.types";

type WorkflowProgressEvent = Extract<
	CliCommandStreamEvent,
	{ type: "progress" }
>["event"];

export function streamLineFromCommandEvent(
	event: CliCommandStreamEvent,
): ChatStreamLine | null {
	if (event.type === "start") {
		return createStreamLine("system", "Workflow rerun started.");
	}
	if (event.type === "stdout" || event.type === "stderr") {
		const text = event.text.trimEnd();
		return text ? createStreamLine(event.type, text) : null;
	}
	if (event.type === "progress") {
		const text = workflowProgressEventText(event.event);
		return text ? createStreamLine("system", text) : null;
	}
	if (event.type === "error") {
		return createStreamLine("stderr", event.error);
	}
	return createStreamLine("system", `Workflow ${event.result.status}.`);
}

export function createStreamLine(
	stream: ChatStreamLine["stream"],
	text: string,
): ChatStreamLine {
	return { id: crypto.randomUUID(), stream, text };
}

export function workflowProgressEventText(
	event: WorkflowProgressEvent,
): string | null {
	const text = firstText(
		event.message,
		event.detail,
		event.summary,
		event.error,
	);
	if (text) {
		return text;
	}
	const action = readText(event.action);
	const status = readText(event.status);
	return action && status ? `${action} ${status}` : (action ?? status);
}

function firstText(...values: unknown[]): string | null {
	for (const value of values) {
		const text = readText(value);
		if (text) {
			return text;
		}
	}
	return null;
}

function readText(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const text = value.trim();
	return text ? text : null;
}
