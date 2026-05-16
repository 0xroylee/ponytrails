import type { WorkflowProgressEvent } from "devos/features/server";
import { eq, sql } from "drizzle-orm";
import { taskExecutionLogsTable } from "../../db";
import { normalizeError } from "../../logger";
import type {
	InternalTaskExecutionLogInput,
	InternalTaskExecutionLogStatus,
	InternalTaskExecutionLogWriter,
} from "./internal-task-execution-log.types";

export async function createInternalTaskExecutionLog(
	input: InternalTaskExecutionLogInput,
): Promise<InternalTaskExecutionLogWriter> {
	const now = input.now ?? (() => new Date().toISOString());
	const id = input.idFactory?.() ?? crypto.randomUUID();
	await input.db.insert(taskExecutionLogsTable).values({
		id,
		taskId: input.taskId,
		status: "running",
		startedAt: now(),
		finishedAt: null,
		log: "",
	});

	return {
		id,
		append: (text) => appendExecutionLog(input.db, id, text),
		appendEvent: (event) =>
			appendExecutionLog(
				input.db,
				id,
				formatExecutionEventLine(input, id, event),
			),
		finish: (result) =>
			finishExecutionLog(
				input.db,
				id,
				result.status === "succeeded" ? "success" : "failed",
				now(),
			),
		fail: (error) =>
			failExecutionLog(input, id, formatExecutionError(error), now()),
	};
}

export function formatStreamLogEvent(input: {
	type: "stdout" | "stderr" | "error";
	text?: string;
	error?: string;
}): WorkflowProgressEvent {
	if (input.type === "error") {
		return {
			schema: "devos.workflow.stream.v1",
			emittedAt: new Date().toISOString(),
			kind: "log",
			stream: "daemon",
			level: "error",
			message: input.error ?? "Unknown daemon stream error",
		};
	}
	return {
		schema: "devos.workflow.stream.v1",
		emittedAt: new Date().toISOString(),
		kind: "log",
		stream: input.type,
		level: input.type === "stderr" ? "warn" : "info",
		message: input.text ?? "",
	};
}

async function appendExecutionLog(
	db: InternalTaskExecutionLogInput["db"],
	id: string,
	text: string,
): Promise<void> {
	if (!text) {
		return;
	}
	await db
		.update(taskExecutionLogsTable)
		.set({ log: sql`${taskExecutionLogsTable.log} || ${text}` })
		.where(eq(taskExecutionLogsTable.id, id));
}

async function finishExecutionLog(
	db: InternalTaskExecutionLogInput["db"],
	id: string,
	status: InternalTaskExecutionLogStatus,
	finishedAt: string,
): Promise<void> {
	await db
		.update(taskExecutionLogsTable)
		.set({ status, finishedAt })
		.where(eq(taskExecutionLogsTable.id, id));
}

async function failExecutionLog(
	input: InternalTaskExecutionLogInput,
	id: string,
	message: string,
	finishedAt: string,
): Promise<void> {
	await appendExecutionLog(
		input.db,
		id,
		`${JSON.stringify({
			schema: "devos.workflow.stream.v1",
			taskId: input.taskId,
			executionLogId: id,
			event: {
				schema: "devos.workflow.stream.v1",
				emittedAt: finishedAt,
				kind: "log",
				stream: "daemon",
				level: "error",
				message,
			},
		})}\n`,
	);
	await finishExecutionLog(input.db, id, "failed", finishedAt);
}

function formatExecutionError(error: unknown): string {
	return String(normalizeError(error).message ?? "Unknown execution error");
}

function formatExecutionEventLine(
	input: InternalTaskExecutionLogInput,
	executionLogId: string,
	event: WorkflowProgressEvent,
): string {
	return `${JSON.stringify({
		schema: "devos.workflow.stream.v1",
		taskId: input.taskId,
		executionLogId,
		event,
	})}\n`;
}
