"use client";

import {
	MISSION_PHASES,
	normalizeMissionPhaseStatus,
	resolveMissionPhaseForStep,
} from "./chat-mission-progress-phases";
import type {
	ChatMissionCheckpoint,
	ChatMissionExecution,
	ChatMissionPhase,
	ChatMissionPhaseId,
	ChatMissionPhaseStatus,
} from "./types/chat-mission-progress.types";

export function createEmptyPhaseCheckpoints(): Record<
	ChatMissionPhaseId,
	ChatMissionCheckpoint[]
> {
	return {
		plan: [],
		implement: [],
		testing: [],
		qa: [],
	};
}

export function createPhaseCheckpoints({
	executions,
	phases,
}: {
	executions: ChatMissionExecution[];
	phases: ChatMissionPhase[];
}): Record<ChatMissionPhaseId, ChatMissionCheckpoint[]> {
	const checkpoints = createEmptyPhaseCheckpoints();
	for (const execution of executions) {
		for (const step of execution.steps) {
			const phaseId = resolveMissionPhaseForStep(step.action, step.detail);
			if (!phaseId) continue;
			const rawStatus = normalizeMissionPhaseStatus(step.status);
			checkpoints[phaseId].push({
				id: `${execution.id}:${step.id}`,
				detail: step.detail ?? undefined,
				label: formatCheckpointLabel(step.action),
				recordedAt: step.recordedAt,
				status: normalizeCheckpointStatus(phaseId, rawStatus, phases),
			});
		}
	}
	for (const phase of MISSION_PHASES) {
		checkpoints[phase.id].sort(compareCheckpoints);
	}
	return checkpoints;
}

function normalizeCheckpointStatus(
	phaseId: ChatMissionPhaseId,
	rawStatus: ChatMissionPhaseStatus,
	phases: ChatMissionPhase[],
): ChatMissionPhaseStatus {
	const phaseStatus = phases.find((phase) => phase.id === phaseId)?.status;
	if (!phaseStatus) return rawStatus;
	if (phaseStatus === "pending") return "pending";
	if (phaseStatus === "success") return "success";
	if (phaseStatus === "running") return rawStatus;
	if (phaseStatus === "failed" || phaseStatus === "warning") {
		return rawStatus === "failed" || rawStatus === "warning"
			? rawStatus
			: phaseStatus;
	}
	return rawStatus;
}

function compareCheckpoints(
	left: ChatMissionCheckpoint,
	right: ChatMissionCheckpoint,
): number {
	return Date.parse(left.recordedAt) - Date.parse(right.recordedAt);
}

function formatCheckpointLabel(action: string): string {
	const normalized = action.trim().replace(/[_-]+/g, " ");
	if (!normalized) return "Checkpoint";
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
