"use client";

import {
	MISSION_PHASES,
	resolveMissionPhaseForStep,
} from "./chat-mission-progress-phases";
import type {
	ChatMissionExecution,
	ChatMissionLogLine,
	ChatMissionPhase,
	ChatMissionPhaseId,
} from "./types/chat-mission-progress.types";

export function createEmptyPhaseLogLines(): Record<
	ChatMissionPhaseId,
	ChatMissionLogLine[]
> {
	return {
		plan: [],
		implement: [],
		testing: [],
		qa: [],
	};
}

export function createPhaseLogLines({
	executions,
	phases,
}: {
	executions: ChatMissionExecution[];
	phases: ChatMissionPhase[];
}): Record<ChatMissionPhaseId, ChatMissionLogLine[]> {
	const phaseLogLines = createEmptyPhaseLogLines();
	const fallbackPhaseId = latestNonPendingPhaseId(phases);
	for (const execution of executions) {
		const windows = createPhaseWindows(execution);
		for (const line of execution.logLines) {
			const phaseId = resolveLogPhaseId(line, windows, fallbackPhaseId);
			phaseLogLines[phaseId].push({ ...line, phaseId });
		}
	}
	return phaseLogLines;
}

function createPhaseWindows(
	execution: ChatMissionExecution,
): Array<{ phaseId: ChatMissionPhaseId; startsAt: number }> {
	const firstStarts = new Map<ChatMissionPhaseId, number>();
	for (const step of execution.steps) {
		const phaseId = resolveMissionPhaseForStep(step.action, step.detail);
		const recordedAt = Date.parse(step.recordedAt);
		if (!phaseId || !Number.isFinite(recordedAt)) continue;
		const previous = firstStarts.get(phaseId);
		if (previous === undefined || recordedAt < previous) {
			firstStarts.set(phaseId, recordedAt);
		}
	}
	return Array.from(firstStarts.entries())
		.map(([phaseId, startsAt]) => ({ phaseId, startsAt }))
		.sort((left, right) => left.startsAt - right.startsAt);
}

function resolveLogPhaseId(
	line: ChatMissionLogLine,
	windows: Array<{ phaseId: ChatMissionPhaseId; startsAt: number }>,
	fallbackPhaseId: ChatMissionPhaseId,
): ChatMissionPhaseId {
	const emittedAt = line.emittedAt ? Date.parse(line.emittedAt) : Number.NaN;
	if (!Number.isFinite(emittedAt)) return fallbackPhaseId;
	if (windows.length === 0) return fallbackPhaseId;
	for (let index = 0; index < windows.length; index += 1) {
		const current = windows[index];
		const next = windows[index + 1];
		if (!current) continue;
		if (emittedAt < current.startsAt) return current.phaseId;
		if (!next || emittedAt < next.startsAt) return current.phaseId;
	}
	return fallbackPhaseId;
}

function latestNonPendingPhaseId(
	phases: ChatMissionPhase[],
): ChatMissionPhaseId {
	for (let index = phases.length - 1; index >= 0; index -= 1) {
		const phase = phases[index];
		if (phase && phase.status !== "pending") return phase.id;
	}
	return "plan";
}
