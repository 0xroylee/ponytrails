import type {
	TaskActivityRecord,
	TaskActivitySourceRows,
} from "./types/task-activity.types";

export function composeTaskActivity(rows: TaskActivitySourceRows) {
	const stepsByLog = new Map(
		rows.executionLogs.map((log) => [
			log.id,
			rows.executionSteps
				.filter((step) => step.executionLogId === log.id)
				.sort((left, right) => left.stepNumber - right.stepNumber)
				.map((step) => ({
					id: step.id,
					stepNumber: step.stepNumber,
					action: step.action,
					status: step.status,
					detail: taskActivityStepDetail(step.detail),
					recordedAt: step.recordedAt,
				})),
		]),
	);
	const activities: TaskActivityRecord[] = [
		{
			id: `${rows.task.id}:created`,
			kind: "created",
			actorId: rows.task.creatorId,
			actorType: "human",
			title: "created this issue",
			body: "",
			status: rows.task.status,
			createdAt: rows.task.createdAt,
		},
		...rows.comments.map((comment) => ({
			id: comment.id,
			kind: "comment" as const,
			actorId: comment.authorId,
			actorType: comment.authorType,
			title:
				comment.authorType === "system"
					? "updated this issue"
					: "commented on this issue",
			body: comment.comment,
			status: null,
			createdAt: comment.createdAt,
		})),
		...rows.executionLogs.map((log) => ({
			id: log.id,
			kind: "execution" as const,
			actorId: "devos",
			actorType: "agent",
			title: "recorded execution output",
			body: taskActivityLogBody(log.log),
			status: log.status,
			createdAt: log.startedAt,
			steps: stepsByLog.get(log.id) ?? [],
		})),
	];
	return {
		taskId: rows.task.id,
		activities: activities.sort((left, right) =>
			left.createdAt.localeCompare(right.createdAt),
		),
	};
}

function taskActivityLogBody(log: string): string {
	return log
		.split(/\r?\n/)
		.filter((line) => isSafeTaskActivityLogLine(line))
		.join("\n");
}

function isSafeTaskActivityLogLine(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("[devos-event:")) return false;
	if (isRawCommandLine(trimmed)) return false;
	return true;
}

function isRawCommandLine(line: string): boolean {
	return /^(?:codex|claude|opencode|cursor|github-copilot)\s+/i.test(line);
}

function taskActivityStepDetail(detail: string | null): string | null {
	if (!detail?.trim()) return null;
	const event = parseJsonRecord(detail);
	if (!event) return detail;
	return readSafeEventDetail(event);
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(value);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

function readSafeEventDetail(event: Record<string, unknown>): string | null {
	for (const field of ["detail", "summary", "error"]) {
		const value = event[field];
		if (typeof value === "string" && value.trim()) {
			return value;
		}
	}
	return null;
}
