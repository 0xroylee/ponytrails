import type { WorkflowTaskExecutionStreamInput } from "./types/workflow-data.types";

const STREAM_EVENT_PREFIX = "[devos-event:";

export function appendMarkedStream(
	currentLog: string,
	marker: string,
	input: WorkflowTaskExecutionStreamInput,
): string {
	const linePrefix = `[${input.emittedAt ?? new Date().toISOString()} ${input.stream}] `;
	const chunk = input.text.endsWith("\n") ? input.text : `${input.text}\n`;
	const separator = currentLog && !currentLog.endsWith("\n") ? "\n" : "";
	return `${currentLog}${separator}${marker}\n${linePrefix}${chunk}`;
}

export function streamEventMarker(eventId: string): string {
	return `${STREAM_EVENT_PREFIX}${eventId}]`;
}
