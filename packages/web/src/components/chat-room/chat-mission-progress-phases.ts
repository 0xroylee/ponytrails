"use client";

import type {
	ChatMissionExecution,
	ChatMissionPhase,
	ChatMissionPhaseId,
	ChatMissionPhaseStatus,
	ChatMissionResult,
} from "./types/chat-mission-progress.types";

export const MISSION_PHASES: Array<{ id: ChatMissionPhaseId; label: string }> =
	[
		{ id: "plan", label: "Plan" },
		{ id: "implement", label: "Implement" },
		{ id: "testing", label: "Testing" },
		{ id: "qa", label: "QA" },
	];

export function createMissionPhases({
	executions,
	latestResult,
	taskStatus,
}: {
	executions: ChatMissionExecution[];
	latestResult: ChatMissionResult | null;
	taskStatus: string;
}): ChatMissionPhase[] {
	const statusByPhase = new Map<ChatMissionPhaseId, ChatMissionPhaseStatus>();
	for (const execution of executions) {
		for (const step of execution.steps) {
			const phase = resolveMissionPhaseForStep(step.action, step.detail);
			if (phase) {
				statusByPhase.set(phase, normalizeMissionPhaseStatus(step.status));
			}
		}
	}
	applyTaskStatusFallback(statusByPhase, taskStatus);
	applyLatestResult(statusByPhase, latestResult);
	completePreviousPhases(statusByPhase);
	return MISSION_PHASES.map((phase) => ({
		...phase,
		status: statusByPhase.get(phase.id) ?? "pending",
	}));
}

function applyTaskStatusFallback(
	statusByPhase: Map<ChatMissionPhaseId, ChatMissionPhaseStatus>,
	taskStatus: string,
): void {
	const normalized = taskStatus.toLowerCase();
	if (normalized === "in_progress" && !statusByPhase.has("implement")) {
		statusByPhase.set("implement", "running");
	}
	if (normalized === "in_review" && !statusByPhase.has("testing")) {
		statusByPhase.set("testing", "running");
	}
}

function applyLatestResult(
	statusByPhase: Map<ChatMissionPhaseId, ChatMissionPhaseStatus>,
	latestResult: ChatMissionResult | null,
): void {
	if (!latestResult) return;
	const qaStatus = resultToneToPhaseStatus(latestResult.tone);
	statusByPhase.set("qa", qaStatus);
	if (!statusByPhase.has("testing")) {
		statusByPhase.set("testing", qaStatus === "success" ? "success" : qaStatus);
	}
}

function completePreviousPhases(
	statusByPhase: Map<ChatMissionPhaseId, ChatMissionPhaseStatus>,
): void {
	const ordered = MISSION_PHASES.map((phase) => phase.id);
	let latestIndex = -1;
	for (let index = ordered.length - 1; index >= 0; index -= 1) {
		const id = ordered[index];
		if (id && statusByPhase.has(id)) {
			latestIndex = index;
			break;
		}
	}
	for (let index = 0; index < latestIndex; index += 1) {
		const id = ordered[index];
		if (id && !statusByPhase.has(id)) statusByPhase.set(id, "success");
	}
}

export function resolveMissionPhaseForStep(
	action: string,
	detail: string | null,
): ChatMissionPhaseId | null {
	const event = parseDetail(detail);
	const stage = stringValue(event.stage).toLowerCase();
	const eventAction = stringValue(event.action).toLowerCase();
	const text = `${action} ${stage} ${eventAction}`.toLowerCase();
	if (
		stage === "plan" ||
		text.includes("split-tasks") ||
		text.includes("checkpoint") ||
		text.includes("plan")
	) {
		return "plan";
	}
	if (stage === "in_progress" || text.includes("implement")) {
		return "implement";
	}
	if (stage === "in_review" || text.includes("review-testing")) {
		return "testing";
	}
	return null;
}

export function normalizeMissionPhaseStatus(
	status: string,
): ChatMissionPhaseStatus {
	const normalized = status.toLowerCase();
	if (["started", "queued", "running"].includes(normalized)) return "running";
	if (["succeeded", "success", "completed", "done"].includes(normalized)) {
		return "success";
	}
	if (["failed", "failure", "error", "rejected"].includes(normalized)) {
		return "failed";
	}
	if (["canceled", "cancelled"].includes(normalized)) return "warning";
	return "pending";
}

function resultToneToPhaseStatus(
	tone: ChatMissionResult["tone"],
): ChatMissionPhaseStatus {
	if (tone === "success") return "success";
	if (tone === "error") return "failed";
	if (tone === "warning") return "warning";
	if (tone === "running") return "running";
	return "pending";
}

function parseDetail(detail: string | null): Record<string, unknown> {
	if (!detail) return {};
	try {
		const parsed = JSON.parse(detail) as unknown;
		return parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function stringValue(value: unknown): string {
	return typeof value === "string" ? value : "";
}
