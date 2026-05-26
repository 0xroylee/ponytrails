"use client";

import {
	BookOpen,
	Database,
	GitBranch,
	GitCommitHorizontal,
	GitPullRequest,
	ListChecks,
	Monitor,
	SquareCode,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import type {
	SkillRecord,
	TaskActivityStepRecord,
	WorkspaceEnvironmentGitStatus,
	WorkspaceEnvironmentResponse,
} from "@/lib/api";
import {
	useSkillsQuery,
	useWorkspaceEnvironmentQuery,
} from "@/lib/api/queries";
import { cn } from "@/lib/utils";

import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";

const MAX_SKILLS = 3;
const MAX_CHECKPOINTS = 4;

export function ChatEnvironmentPanel({
	missionProgress,
	projectId,
	onDraftCommand,
}: {
	missionProgress: ChatMissionProgressViewModel | null;
	projectId: string | null;
	onDraftCommand: (draft: string) => void;
}): ReactElement {
	const environmentQuery = useWorkspaceEnvironmentQuery(projectId, {
		refetchIntervalMs: 5000,
	});
	const skillsQuery = useSkillsQuery({ refetchIntervalMs: 30000 });
	const environment = environmentQuery.data;
	const checkpoints = latestCheckpoints(missionProgress);

	return (
		<aside className="absolute right-6 top-6 hidden w-64 rounded-lg border border-zinc-700/80 bg-zinc-800/95 px-4 py-4 text-zinc-100 backdrop-blur xl:grid">
			<header className="mb-4 flex items-center justify-between">
				<Typography className="text-zinc-400" variant="sectionTitle">
					Environment
				</Typography>
				<SquareCode aria-hidden="true" className="text-zinc-400" size={18} />
			</header>
			<div className="grid gap-3">
				<EnvironmentRow icon={<SquareCode size={16} />} label="Changes">
					<ChangeSummary environment={environment} />
				</EnvironmentRow>
				<EnvironmentRow icon={<Monitor size={16} />} label="Local">
					<Typography className="max-w-36 truncate text-zinc-400">
						{environment?.folder ?? "Loading..."}
					</Typography>
				</EnvironmentRow>
				<EnvironmentRow icon={<GitBranch size={16} />} label="Branch">
					<Typography className="max-w-36 truncate">
						{branchLabel(environment?.git)}
					</Typography>
				</EnvironmentRow>
				<ActionRow
					icon={<GitCommitHorizontal size={16} />}
					label="Commit"
					onClick={() => onDraftCommand("Commit the current changes.")}
				/>
				<ActionRow
					icon={<GitPullRequest size={16} />}
					label="Create pull request"
					onClick={() =>
						onDraftCommand("Create a pull request for the current branch.")
					}
				/>
			</div>
			<div className="my-4 h-px bg-zinc-700/70" />
			<div className="grid gap-3">
				<Typography variant="sectionTitle">Sources</Typography>
				{environment?.mcps.map((source) => (
					<EnvironmentRow
						icon={<Database size={16} />}
						key={source.id}
						label={source.label}
					>
						<StatusDot active={source.available} />
					</EnvironmentRow>
				))}
				<SkillsRows skills={skillsQuery.data} />
				<CheckpointRows checkpoints={checkpoints} />
			</div>
		</aside>
	);
}

function EnvironmentRow({
	children,
	icon,
	label,
}: {
	children?: ReactNode;
	icon: ReactNode;
	label: string;
}): ReactElement {
	return (
		<div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3">
			<span className="text-zinc-400">{icon}</span>
			<Typography className="min-w-0 truncate" variant="cardTitle">
				{label}
			</Typography>
			{children}
		</div>
	);
}

function ActionRow({
	icon,
	label,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
}): ReactElement {
	return (
		<button
			className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1 text-left text-zinc-100 transition hover:bg-zinc-700/70 focus:outline-none focus:ring-2 focus:ring-zinc-500"
			onClick={onClick}
			type="button"
		>
			<span className="text-zinc-400">{icon}</span>
			<Typography className="min-w-0 truncate" variant="cardTitle">
				{label}
			</Typography>
		</button>
	);
}

function ChangeSummary({
	environment,
}: {
	environment: WorkspaceEnvironmentResponse | undefined;
}): ReactElement {
	const git = environment?.git;
	if (!git?.available) {
		return <Typography className="text-zinc-500">Unavailable</Typography>;
	}
	return (
		<span className="flex items-center gap-1 text-sm tabular-nums">
			<Typography as="span" className="text-emerald-400">
				+{git.added}
			</Typography>
			<Typography as="span" className="text-red-400">
				-{git.deleted}
			</Typography>
			{git.untracked > 0 ? (
				<Typography as="span" className="text-zinc-400">
					?{git.untracked}
				</Typography>
			) : null}
		</span>
	);
}

function SkillsRows({
	skills,
}: {
	skills: SkillRecord[] | undefined;
}): ReactElement {
	const visibleSkills = skills?.slice(0, MAX_SKILLS) ?? [];
	const skillNames =
		visibleSkills.map((skill) => skill.name).join(", ") || "None";
	const overflow =
		skills && skills.length > MAX_SKILLS
			? ` +${skills.length - MAX_SKILLS}`
			: "";
	const label = skills ? `${skillNames}${overflow}` : "Loading";
	return (
		<EnvironmentRow icon={<BookOpen size={16} />} label="Skills">
			<Typography className="max-w-40 truncate text-zinc-400">
				{label}
			</Typography>
		</EnvironmentRow>
	);
}

function CheckpointRows({
	checkpoints,
}: {
	checkpoints: TaskActivityStepRecord[];
}): ReactElement {
	const label =
		checkpoints.length > 0
			? `${completedCount(checkpoints)}/${checkpoints.length}`
			: "None";
	return (
		<EnvironmentRow icon={<ListChecks size={16} />} label="Checkpoints">
			<Typography className="text-zinc-400">{label}</Typography>
		</EnvironmentRow>
	);
}

function StatusDot({ active }: { active: boolean }): ReactElement {
	return (
		<span
			className={cn(
				"h-2.5 w-2.5 rounded-full",
				active ? "bg-emerald-400" : "bg-zinc-500",
			)}
		/>
	);
}

function branchLabel(git: WorkspaceEnvironmentGitStatus | undefined): string {
	if (!git) return "Loading...";
	if (!git.available) return git.reason ?? "Unavailable";
	return git.branch ?? "HEAD";
}

function latestCheckpoints(
	mission: ChatMissionProgressViewModel | null,
): TaskActivityStepRecord[] {
	const executions = mission?.executions ?? [];
	for (let index = executions.length - 1; index >= 0; index -= 1) {
		const execution = executions[index];
		if (execution?.steps.length) {
			return execution.steps.slice(0, MAX_CHECKPOINTS);
		}
	}
	return [];
}

function completedCount(checkpoints: TaskActivityStepRecord[]): number {
	return checkpoints.filter((checkpoint) =>
		["succeeded", "success", "completed", "done"].includes(
			checkpoint.status.toLowerCase(),
		),
	).length;
}
