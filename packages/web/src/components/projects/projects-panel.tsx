"use client";

import { Plus, RefreshCw } from "lucide-react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useState } from "react";

import { useCreateProjectMutation } from "@/lib/api/queries";
import { useWorkspaceProjectsQuery } from "@/lib/api/realtime-queries";

import {
	EMPTY_PROJECT_FORM_STATE,
	buildProjectCreateRequest,
} from "./projects-panel-utils";
import type { ProjectFormState } from "./projects-panel.types";

const LOCAL_WORKSPACE_ID = "owner-1";
const LOCAL_BOARD_ID = "board-1";

const FIELD_GROUPS: Array<{
	title: string;
	fields: Array<{
		name: keyof ProjectFormState;
		label: string;
		placeholder?: string;
		type?: "number" | "text";
	}>;
}> = [
	{
		title: "Identity",
		fields: [
			{ name: "name", label: "Project name" },
			{ name: "externalProjectId", label: "External project ID" },
			{ name: "description", label: "Description" },
		],
	},
	{
		title: "Repository",
		fields: [
			{ name: "repoOwner", label: "Repo owner", placeholder: "octo" },
			{ name: "repoName", label: "Repo name", placeholder: "core" },
			{ name: "baseBranch", label: "Base branch" },
			{ name: "localFolder", label: "Local folder" },
		],
	},
	{
		title: "Ownership",
		fields: [
			{ name: "lead", label: "Lead" },
			{ name: "category", label: "Category" },
			{ name: "priority", label: "Priority", type: "number" },
		],
	},
];

export function ProjectsPanel(): ReactElement {
	const [form, setForm] = useState<ProjectFormState>({
		...EMPTY_PROJECT_FORM_STATE,
	});
	const [formError, setFormError] = useState<string | null>(null);
	const projectsQuery = useWorkspaceProjectsQuery(LOCAL_WORKSPACE_ID, {
		refetchIntervalMs: false,
	});
	const createProject = useCreateProjectMutation();

	function updateField(
		field: keyof ProjectFormState,
		event: ChangeEvent<HTMLInputElement>,
	): void {
		setForm((current) => ({ ...current, [field]: event.target.value }));
	}

	async function submitProject(
		event: FormEvent<HTMLFormElement>,
	): Promise<void> {
		event.preventDefault();
		setFormError(null);
		try {
			await createProject.mutateAsync(
				buildProjectCreateRequest(form, {
					boardId: LOCAL_BOARD_ID,
					ownerId: LOCAL_WORKSPACE_ID,
				}),
			);
			setForm({ ...EMPTY_PROJECT_FORM_STATE });
		} catch (error) {
			setFormError(
				error instanceof Error ? error.message : "Project save failed",
			);
		}
	}

	return (
		<section className="h-[100dvh] max-h-[100dvh] overflow-auto bg-theme-canvas p-4 text-theme-primary">
			<header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-theme-default pb-4">
				<div>
					<h1 className="m-0 text-2xl font-semibold">Projects</h1>
					<p className="m-0 mt-1 text-sm text-theme-secondary">
						{projectsQuery.data?.length ?? 0} configured
					</p>
				</div>
				<button
					type="button"
					className="inline-flex items-center gap-2 rounded border border-theme-default px-3 py-2 text-sm text-theme-secondary hover-bg-theme-subtle"
					onClick={() => void projectsQuery.refetch()}
				>
					<RefreshCw size={16} />
					Refresh
				</button>
			</header>

			<div className="grid gap-4 lg:grid-cols-[minmax(20rem,28rem)_1fr]">
				<form
					className="grid content-start gap-4 border border-theme-default bg-theme-panel-elevated p-4"
					onSubmit={submitProject}
				>
					{FIELD_GROUPS.map((group) => (
						<fieldset
							key={group.title}
							className="grid gap-3 border-0 border-t border-theme-default p-0 pt-3 first:border-t-0 first:pt-0"
						>
							<legend className="mb-1 text-sm font-medium text-theme-secondary">
								{group.title}
							</legend>
							{group.fields.map((field) => (
								<label key={field.name} className="grid gap-1 text-sm">
									<span className="text-theme-secondary">{field.label}</span>
									<input
										className="h-10 border border-theme-default bg-theme-subtle px-3 text-theme-primary outline-none focus:border-cyan-600"
										name={field.name}
										placeholder={field.placeholder}
										type={field.type ?? "text"}
										value={form[field.name]}
										onChange={(event) => updateField(field.name, event)}
									/>
								</label>
							))}
						</fieldset>
					))}
					{formError ? (
						<p className="m-0 text-sm text-red-300">{formError}</p>
					) : null}
					<button
						type="submit"
						className="inline-flex h-10 items-center justify-center gap-2 border border-cyan-700 bg-cyan-950 px-3 text-sm font-medium text-cyan-100 hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={createProject.isPending}
					>
						<Plus size={16} />
						Create project
					</button>
				</form>

				<section className="min-w-0 border border-theme-default bg-theme-panel-elevated">
					<div className="border-b border-theme-default px-4 py-3">
						<h2 className="m-0 text-base font-semibold">Workspace projects</h2>
					</div>
					<div className="grid gap-0">
						{projectsQuery.isLoading ? (
							<p className="m-0 p-4 text-sm text-theme-secondary">
								Loading projects
							</p>
						) : null}
						{projectsQuery.error ? (
							<p className="m-0 p-4 text-sm text-red-300">
								{projectsQuery.error.message}
							</p>
						) : null}
						{(projectsQuery.data ?? []).map((project) => (
							<article
								key={project.id}
								className="grid gap-2 border-b border-theme-default p-4 last:border-b-0"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h3 className="m-0 text-base font-semibold">
										{project.name}
									</h3>
									<span className="text-xs text-theme-muted">{project.id}</span>
								</div>
								<p className="m-0 text-sm text-theme-secondary">
									{project.description ?? "No description"}
								</p>
								<div className="flex flex-wrap gap-2 text-xs text-theme-muted">
									<span>
										{project.repoOwner ?? "-"} / {project.repoName ?? "-"}
									</span>
									<span>{project.baseBranch ?? "main"}</span>
									<span>{project.localFolder ?? "No local folder"}</span>
								</div>
							</article>
						))}
						{!projectsQuery.isLoading &&
						!projectsQuery.error &&
						(projectsQuery.data?.length ?? 0) === 0 ? (
							<p className="m-0 p-4 text-sm text-theme-secondary">
								No projects yet
							</p>
						) : null}
					</div>
				</section>
			</div>
		</section>
	);
}
