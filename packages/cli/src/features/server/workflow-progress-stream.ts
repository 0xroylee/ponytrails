import type {
	CliCommandStreamEmit,
	CliCommandStreamEvent,
} from "./cli-command-executor.types";
import {
	WORKFLOW_PROGRESS_SENTINEL,
	parseWorkflowProgressLine,
} from "./workflow-progress";

export interface WorkflowProgressStdoutProcessor {
	push(text: string): void;
	flush(): void;
	stdout(): string;
}

export function createWorkflowProgressStdoutProcessor(
	emit: CliCommandStreamEmit,
): WorkflowProgressStdoutProcessor {
	let buffer = "";
	let visibleStdout = "";

	const emitStdout = (text: string): void => {
		if (!text) {
			return;
		}
		visibleStdout += text;
		emit({ type: "stdout", text });
	};

	const handleLine = (line: string): void => {
		const parsed = parseWorkflowProgressLine(line.trimEnd());
		if (parsed.status === "ignored") {
			emitStdout(line);
			return;
		}
		if (parsed.status === "ok") {
			emit({ type: "progress", event: parsed.event });
			return;
		}
		emitProgressParseError(emit, parsed.error);
	};

	return {
		push(text) {
			buffer += text;
			while (true) {
				const newlineIndex = buffer.indexOf("\n");
				if (newlineIndex < 0) {
					break;
				}
				const line = buffer.slice(0, newlineIndex + 1);
				buffer = buffer.slice(newlineIndex + 1);
				handleLine(line);
			}
			if (buffer && !WORKFLOW_PROGRESS_SENTINEL.startsWith(buffer)) {
				emitStdout(buffer);
				buffer = "";
			}
		},
		flush() {
			if (!buffer) {
				return;
			}
			handleLine(buffer);
			buffer = "";
		},
		stdout: () => visibleStdout,
	};
}

function emitProgressParseError(
	emit: CliCommandStreamEmit,
	error: string,
): void {
	const event: Extract<CliCommandStreamEvent, { type: "progress" }> = {
		type: "progress",
		event: {
			schema: "devos.workflow.stream.v1",
			emittedAt: new Date().toISOString(),
			kind: "log",
			stream: "daemon",
			level: "error",
			message: `Malformed workflow progress sentinel: ${error}`,
		},
	};
	emit(event);
}
