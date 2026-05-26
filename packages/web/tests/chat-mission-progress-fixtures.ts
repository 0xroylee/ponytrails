import { createChatMissionProgressModel } from "../src/components/chat-room/chat-mission-progress-state";
import type { ChatMissionProgressViewModel } from "../src/components/chat-room/types/chat-mission-progress.types";
import type {
	ChatMessageRecord,
	ChatSessionRecord,
	ProjectBoardTaskRecord,
	TaskActivityRecord,
	TaskActivityStepRecord,
	TokenUsageRecord,
} from "../src/lib/api";

export function missionModel(
	status = "succeeded",
	taskStatus = "in_progress",
	usageRecords: TokenUsageRecord[] = [],
): ChatMissionProgressViewModel {
	return createChatMissionProgressModel({
		task: boardTask(taskStatus),
		activity: {
			taskId: "task-42",
			activities: [statusComment(), executionActivity(status)],
		},
		usageRecords,
	});
}

export function tokenUsageRecord(
	overrides: Partial<TokenUsageRecord> = {},
): TokenUsageRecord {
	return {
		id: "usage-1",
		runId: "run-1",
		taskId: "task-42",
		taskExecutionLogId: "exec-1",
		stage: "implementing",
		agentBackend: "codex",
		model: "gpt-5",
		inputTokens: 1000,
		outputTokens: 250,
		totalTokens: 1250,
		estimatedCostMicrousd: 20000,
		recordedAt: "2026-05-20T00:05:00.000Z",
		...overrides,
	};
}

export function chatMessage(
	overrides: Partial<ChatMessageRecord> = {},
): ChatMessageRecord {
	return {
		id: "message-1",
		sessionId: "session-1",
		role: "user",
		kind: "message",
		content: "Message",
		taskId: "task-42",
		commandAction: null,
		metadata: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}

export function chatSession(): ChatSessionRecord {
	return {
		id: "session-1",
		workspaceId: "owner-1",
		projectId: "default",
		taskId: "task-42",
		title: "Untitled",
		pendingRequest: null,
		pendingQuestions: [],
		archived: false,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
	};
}

export function textContent(html: string): string {
	return html.replace(/<[^>]*>/g, "");
}

function statusComment(): TaskActivityRecord {
	return {
		id: "comment-1",
		kind: "comment",
		actorId: "system",
		actorType: "system",
		title: "updated this issue",
		body: "changed status from `plan` to `in_progress`",
		status: null,
		createdAt: "2026-05-20T00:01:00.000Z",
	};
}

function executionActivity(status: string): TaskActivityRecord {
	return {
		id: "exec-1",
		kind: "execution",
		actorId: "devos",
		actorType: "agent",
		title: "recorded execution output",
		body: [
			"[2026-05-20T00:02:45.000Z stdout] Plan output",
			"[2026-05-20T00:04:45.000Z stdout] Implement output",
			"[2026-05-20T00:06:45.000Z stderr] Testing output",
		].join("\n"),
		status,
		createdAt: "2026-05-20T00:02:00.000Z",
		steps: [
			activityStep(1, "plan", "plan"),
			activityStep(2, "split-tasks", "plan"),
			activityStep(3, "implementation", "in_progress"),
			activityStep(4, "prepare-pr", "in_progress"),
			activityStep(5, "review-testing", "in_review"),
		],
	};
}

function activityStep(
	stepNumber: number,
	action: string,
	stage: string,
): TaskActivityStepRecord {
	return {
		id: `step-${stepNumber}`,
		stepNumber,
		action,
		status: "succeeded",
		detail: JSON.stringify({ stage, action }),
		recordedAt: `2026-05-20T00:0${stepNumber + 1}:30.000Z`,
	};
}

function boardTask(status = "in_progress"): ProjectBoardTaskRecord {
	return {
		id: "task-42",
		taskKey: "TASK-42",
		projectId: "project-1",
		title: "Show mission progress",
		content: "Display progress in the chat transcript.",
		priority: 2,
		status,
		dueDate: null,
		creatorId: "owner-1",
		assigneeId: null,
		linkedPr: null,
		linearIssueId: null,
		linearIdentifier: null,
		linearUrl: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:03:00.000Z",
	};
}
