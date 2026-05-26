"use client";

import {
	MISSION_PHASES,
	normalizeMissionPhaseStatus,
	resolveMissionPhaseForStep,
} from "./chat-mission-progress-phases";
import type {
	ChatMissionCheckpoint,
	ChatMissionExecution,
	ChatMissionPhaseId,
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

export function createPhaseCheckpoints(
	executions: ChatMissionExecution[],
): Record<ChatMissionPhaseId, ChatMissionCheckpoint[]> {
	const checkpoints = createEmptyPhaseCheckpoints();
	for (const execution of executions) {
		for (const step of execution.steps) {
			const phaseId = resolveMissionPhaseForStep(step.action, step.detail);
			if (!phaseId) continue;
			checkpoints[phaseId].push({
				id: `${execution.id}:${step.id}`,
				detail: step.detail ?? undefined,
				label: formatCheckpointLabel(step.action),
				recordedAt: step.recordedAt,
				status: normalizeMissionPhaseStatus(step.status),
			});
		}
	}
	for (const phase of MISSION_PHASES) {
		checkpoints[phase.id].sort(compareCheckpoints);
	}
	return checkpoints;
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
