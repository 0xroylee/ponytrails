"use client";

import { Terminal } from "lucide-react";
import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { MissionCheckpointPanel } from "./chat-mission-checkpoint-panel";
import {
	selectedPhaseCheckpoints,
	selectedPhaseLogLines,
	useMissionPhaseSelection,
} from "./chat-mission-progress-log-selection";
import { MissionStatusIcon } from "./chat-mission-progress-status-icon";
import { MissionUsageSummary } from "./chat-mission-usage-summary";
import type {
	ChatMissionLogLine,
	ChatMissionPhase,
	ChatMissionPhaseId,
	ChatMissionProgressViewModel,
} from "./types/chat-mission-progress.types";

export function MissionBody({
	liveLogLines,
	mission,
}: {
	liveLogLines: ChatMissionLogLine[];
	mission: ChatMissionProgressViewModel;
}): ReactElement {
	const { selectedPhase, selectedPhaseId, selectPhase } =
		useMissionPhaseSelection(mission);
	const logLines = selectedPhaseLogLines({
		liveLogLines,
		mission,
		selectedPhase,
	});
	const checkpoints = selectedPhaseCheckpoints({ mission, selectedPhase });
	return (
		<div className="grid gap-3">
			<MissionHeader mission={mission} />
			<MissionUsageSummary mission={mission} />
			<WorkflowPhases
				phases={mission.phases}
				selectedPhaseId={selectedPhaseId}
				onSelectPhase={selectPhase}
			/>
			<MissionCheckpointPanel
				checkpoints={checkpoints}
				phaseLabel={selectedPhase.label}
			/>
			<LatestLogPanel lines={logLines} phaseLabel={selectedPhase.label} />
		</div>
	);
}

function MissionHeader({
	mission,
}: {
	mission: ChatMissionProgressViewModel;
}): ReactElement {
	return (
		<header className="flex flex-wrap items-start justify-between gap-3">
			<div className="min-w-0">
				<Typography className="text-muted-foreground" variant="eyebrow">
					Mission
				</Typography>
				<Typography className="mt-1 truncate" variant="sectionTitle">
					{mission.title.trim() || "Untitled task"}
				</Typography>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{mission.taskKey ? (
					<Typography
						className="rounded-sm border border-border bg-surface-inset px-2 py-1"
						variant="metadata"
					>
						{mission.taskKey}
					</Typography>
				) : null}
				<Typography
					className="rounded-sm border border-border bg-surface-inset px-2 py-1"
					variant="metadata"
				>
					{mission.statusLabel}
				</Typography>
			</div>
		</header>
	);
}

function LatestLogPanel({
	lines,
	phaseLabel,
}: {
	lines: ChatMissionLogLine[];
	phaseLabel: string;
}): ReactElement {
	return (
		<section
			className="grid gap-2 rounded-md border border-border bg-surface-inset px-3 py-2"
			data-mission-log-panel="true"
		>
			<div className="flex items-center gap-2 text-muted-foreground">
				<Terminal size={14} />
				<Typography variant="eyebrow">{phaseLabel} output</Typography>
			</div>
			<div className="grid max-h-36 min-h-12 gap-1 overflow-auto font-mono text-xs text-zinc-300">
				{lines.length > 0 ? (
					lines.map((line) => <MissionLogLine key={line.id} line={line} />)
				) : (
					<Typography className="text-muted-foreground" variant="mono">
						No output recorded for this stage.
					</Typography>
				)}
			</div>
		</section>
	);
}

function WorkflowPhases({
	onSelectPhase,
	phases,
	selectedPhaseId,
}: {
	onSelectPhase: (phaseId: ChatMissionPhaseId) => void;
	phases: ChatMissionPhase[];
	selectedPhaseId: ChatMissionPhaseId;
}): ReactElement {
	return (
		<div
			className="grid gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))]"
			data-mission-workflow="true"
		>
			{phases.map((phase, index) => (
				<PhaseNode
					isFirst={index === 0}
					isSelected={phase.id === selectedPhaseId}
					key={phase.id}
					phase={phase}
					onSelectPhase={onSelectPhase}
				/>
			))}
		</div>
	);
}

function PhaseNode({
	isFirst,
	isSelected,
	onSelectPhase,
	phase,
}: {
	isFirst: boolean;
	isSelected: boolean;
	onSelectPhase: (phaseId: ChatMissionPhaseId) => void;
	phase: ChatMissionPhase;
}): ReactElement {
	return (
		<button
			aria-label={`Show ${phase.label} output`}
			aria-pressed={isSelected}
			className={cn(
				"relative grid min-h-20 gap-2 rounded-md border bg-surface-panel px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-zinc-500",
				phase.status === "success" && "border-emerald-900/70",
				phase.status === "failed" && "border-red-900/70 bg-red-950/20",
				phase.status === "running" && "border-sky-900/70",
				phase.status === "warning" && "border-amber-900/70",
				phase.status === "pending" && "border-border",
				isSelected && "bg-surface-active ring-1 ring-zinc-500",
				!isFirst &&
					"before:absolute before:-left-2 before:top-1/2 before:hidden before:h-px before:w-2 before:bg-border sm:before:block",
			)}
			data-mission-phase={phase.id}
			data-mission-phase-selected={isSelected ? "true" : "false"}
			data-mission-phase-status={phase.status}
			onClick={() => onSelectPhase(phase.id)}
			type="button"
		>
			<div className="flex items-center gap-2">
				<MissionStatusIcon status={phase.status} />
				<Typography className="min-w-0 truncate" variant="cardTitle">
					{phase.label}
				</Typography>
			</div>
			<Typography className="capitalize text-muted-foreground" variant="muted">
				{phase.status}
			</Typography>
		</button>
	);
}

function MissionLogLine({
	line,
}: {
	line: ChatMissionLogLine;
}): ReactElement {
	return (
		<Typography
			className={cn(
				"whitespace-pre-wrap break-words",
				line.stream === "stderr" && "text-red-200",
				line.stream === "system" && "text-muted-foreground",
			)}
			variant="mono"
		>
			{line.text}
		</Typography>
	);
}
