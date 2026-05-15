"use client";

import { Columns3, Filter, SlidersHorizontal } from "lucide-react";
import { type ReactElement, useEffect, useMemo, useState } from "react";

import { TaskCreateChatDialog } from "@/components/task-create/task-create-chat-dialog";
import type { TaskMutationRequest, WorkspaceProjectRecord } from "@/lib/api";
import {
	useCreateBoardTaskMutation,
	useDeleteBoardTaskMutation,
	useProjectBoardQuery,
	useUpdateBoardTaskMutation,
} from "@/lib/api/queries";

import { IssueDialog } from "./issue-dialog";
import {
	BoardContent,
	BoardHeader,
	ColumnToggles,
	ToolButton,
} from "./issues-board-parts";
import {
	filterTaskByTab,
	matchesSearch,
	sortColumns,
	toggleAllColumns,
	toggleStatus,
} from "./issues-board-utils";
import { STATUS_ORDER } from "./issues-board.constants";
import type {
	IssueDialogState,
	IssueTab,
	OpenIssueRequest,
} from "./issues-board.types";

interface IssuesBoardProps {
	createIssueRequest: number;
	isProjectsLoading: boolean;
	openIssueRequest: OpenIssueRequest | null;
	onProjectIdChange: (projectId: string | null) => void;
	onWorkspaceIdChange: (workspaceId: string) => void;
	projectId: string | null;
	projects: WorkspaceProjectRecord[] | undefined;
	projectsError: Error | null;
	workspaceId: string;
}

export function IssuesBoard({
	createIssueRequest,
	isProjectsLoading,
	openIssueRequest,
	onProjectIdChange,
	onWorkspaceIdChange,
	projectId,
	projects,
	projectsError,
	workspaceId,
}: IssuesBoardProps): ReactElement {
	const [activeTab, setActiveTab] = useState<IssueTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortNewestFirst, setSortNewestFirst] = useState(true);
	const [visibleStatuses, setVisibleStatuses] = useState<string[]>([
		...STATUS_ORDER,
	]);
	const [dialog, setDialog] = useState<IssueDialogState>(null);
	const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const selectedProjectId = projectId ?? projects?.[0]?.id ?? null;
	const boardQuery = useProjectBoardQuery(workspaceId, selectedProjectId);
	const createTask = useCreateBoardTaskMutation(workspaceId, selectedProjectId);
	const updateTask = useUpdateBoardTaskMutation(workspaceId, selectedProjectId);
	const deleteTask = useDeleteBoardTaskMutation(workspaceId, selectedProjectId);

	useEffect(() => {
		if (!projectId && projects?.[0]) {
			onProjectIdChange(projects[0].id);
		}
	}, [onProjectIdChange, projectId, projects]);

	useEffect(() => {
		if (createIssueRequest > 0) {
			setIsChatDialogOpen(true);
		}
	}, [createIssueRequest]);

	useEffect(() => {
		if (!openIssueRequest || !boardQuery.data) {
			return;
		}
		const task = boardQuery.data.statusColumns
			.flatMap((column) => column.tasks)
			.find((candidate) => candidate.id === openIssueRequest.taskId);
		if (task) {
			setDialog({ mode: "edit", task });
		}
	}, [boardQuery.data, openIssueRequest]);

	const columns = useMemo(() => {
		return sortColumns(boardQuery.data?.statusColumns ?? [])
			.filter((column) => visibleStatuses.includes(column.status))
			.map((column) => ({
				...column,
				tasks: column.tasks
					.filter((task) => filterTaskByTab(task, activeTab))
					.filter((task) => matchesSearch(task, searchQuery))
					.sort((left, right) =>
						sortNewestFirst
							? right.createdAt.localeCompare(left.createdAt)
							: left.createdAt.localeCompare(right.createdAt),
					),
			}));
	}, [
		activeTab,
		boardQuery.data,
		searchQuery,
		sortNewestFirst,
		visibleStatuses,
	]);

	const taskCount = columns.reduce(
		(sum, column) => sum + column.tasks.length,
		0,
	);
	const dialogStatus =
		dialog?.mode === "create"
			? dialog.status
			: (dialog?.task.status ?? "planning");

	async function submitDialog(input: TaskMutationRequest): Promise<void> {
		setMutationError(null);
		try {
			if (dialog?.mode === "edit") {
				await updateTask.mutateAsync({ taskId: dialog.task.id, task: input });
			} else {
				await createTask.mutateAsync(input);
			}
			setDialog(null);
		} catch (error) {
			setMutationError(error instanceof Error ? error.message : "Save failed");
		}
	}

	async function deleteDialogTask(): Promise<void> {
		if (dialog?.mode !== "edit") {
			return;
		}
		setMutationError(null);
		try {
			await deleteTask.mutateAsync(dialog.task.id);
			setDialog(null);
		} catch (error) {
			setMutationError(
				error instanceof Error ? error.message : "Delete failed",
			);
		}
	}

	return (
		<section className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0f1013] text-zinc-100">
			<BoardHeader
				activeTab={activeTab}
				onTabChange={setActiveTab}
				onCreateIssue={() => setIsChatDialogOpen(true)}
			/>
			<div className="flex flex-wrap items-center gap-3 border-b border-zinc-900 px-5 py-3">
				<input
					aria-label="Workspace ID"
					className="issue-input h-9 max-w-44"
					onChange={(event) => onWorkspaceIdChange(event.target.value)}
					value={workspaceId}
				/>
				<select
					aria-label="Project"
					className="issue-input h-9 max-w-56"
					onChange={(event) => onProjectIdChange(event.target.value)}
					value={selectedProjectId ?? ""}
				>
					{projects?.map((project) => (
						<option key={project.id} value={project.id}>
							{project.name}
						</option>
					))}
				</select>
				<input
					aria-label="Search issues"
					className="issue-input h-9 min-w-52 flex-1"
					onChange={(event) => setSearchQuery(event.target.value)}
					placeholder="Search issues"
					value={searchQuery}
				/>
				<ToolButton
					icon={<Filter size={16} />}
					label={`${taskCount} shown`}
					onClick={() => setActiveTab("all")}
				/>
				<ToolButton
					icon={<SlidersHorizontal size={16} />}
					label={sortNewestFirst ? "Newest" : "Oldest"}
					onClick={() => setSortNewestFirst((value) => !value)}
				/>
				<ToolButton
					icon={<Columns3 size={16} />}
					label="Columns"
					onClick={() => toggleAllColumns(visibleStatuses, setVisibleStatuses)}
				/>
			</div>
			<ColumnToggles
				visibleStatuses={visibleStatuses}
				onToggle={(status) => toggleStatus(status, setVisibleStatuses)}
			/>
			<BoardContent
				columns={columns}
				error={projectsError ?? boardQuery.error}
				isLoading={isProjectsLoading || boardQuery.isLoading}
				onCreateIssue={(status) => setDialog({ mode: "create", status })}
				onOpenIssue={(task) => setDialog({ mode: "edit", task })}
			/>
			{dialog && selectedProjectId ? (
				<IssueDialog
					defaultStatus={dialogStatus}
					errorMessage={mutationError}
					isDeleting={deleteTask.isPending}
					isSaving={createTask.isPending || updateTask.isPending}
					mode={dialog.mode}
					onClose={() => setDialog(null)}
					onDelete={dialog.mode === "edit" ? deleteDialogTask : undefined}
					onSubmit={submitDialog}
					projectId={selectedProjectId}
					task={dialog.mode === "edit" ? dialog.task : undefined}
				/>
			) : null}
			{isChatDialogOpen ? (
				<TaskCreateChatDialog
					defaultBoardProjectId={selectedProjectId ?? ""}
					key={selectedProjectId ?? "pending-project"}
					onClose={() => setIsChatDialogOpen(false)}
				/>
			) : null}
		</section>
	);
}
