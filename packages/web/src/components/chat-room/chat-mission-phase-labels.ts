"use client";

import type {
	ChatMissionPhase,
	ChatMissionPhaseId,
} from "./types/chat-mission-progress.types";

export const CHAT_WORKFLOW_THINKING_LABEL = "Thinking";
export const CHAT_WORKFLOW_PLANNING_LABEL = "Planning";
const CHAT_WORKFLOW_IMPLEMENTING_LABEL = "Implementing";
const CHAT_WORKFLOW_TESTING_LABEL = "Testing";

const TASK_STATUS_LABELS = new Map<string, string>([
	["plan", CHAT_WORKFLOW_PLANNING_LABEL],
	["planning", CHAT_WORKFLOW_PLANNING_LABEL],
	["todo", CHAT_WORKFLOW_PLANNING_LABEL],
	["in_progress", CHAT_WORKFLOW_IMPLEMENTING_LABEL],
	["in_review", CHAT_WORKFLOW_TESTING_LABEL],
	["done", "Done"],
	["failed", "Failed"],
	["canceled", "Canceled"],
	["cancelled", "Cancelled"],
]);

const PHASE_LABELS = new Map<ChatMissionPhaseId, string>([
	["plan", CHAT_WORKFLOW_PLANNING_LABEL],
	["implement", CHAT_WORKFLOW_IMPLEMENTING_LABEL],
	["testing", CHAT_WORKFLOW_TESTING_LABEL],
	["qa", "QA"],
]);

export function resolveMissionStatusLabel({
	phases,
	taskStatus,
}: {
	phases?: ChatMissionPhase[];
	taskStatus: string;
}): string {
	const statusLabel = TASK_STATUS_LABELS.get(taskStatus.toLowerCase());
	if (statusLabel) return statusLabel;
	const runningPhase = phases?.find((phase) => phase.status === "running");
	if (runningPhase) {
		return PHASE_LABELS.get(runningPhase.id) ?? runningPhase.label;
	}
	return formatTaskStatusLabel(taskStatus);
}

export function resolvePlanningStatusLabel(
	taskStatus?: string | null,
): string | null {
	if (!taskStatus) return null;
	const label = TASK_STATUS_LABELS.get(taskStatus.toLowerCase());
	return label === CHAT_WORKFLOW_PLANNING_LABEL ? label : null;
}

export function formatTaskStatusLabel(status: string): string {
	return status
		.replace(/[_-]+/g, " ")
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatWorkflowLoadingLabel(statusLabel: string): string {
	return `${statusLabel}...`;
}
