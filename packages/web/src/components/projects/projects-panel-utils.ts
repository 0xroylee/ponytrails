import type {
	GitHubRepositoryRecord,
	ProjectCreateRequest,
	ProjectUpdateRequest,
	WorkspaceProjectRecord,
} from "@/lib/api";
import type {
	ProjectCreateDefaults,
	ProjectDisplayRow,
	ProjectFormState,
} from "./types/projects-panel.types";

const EMPTY_LABEL = "--";
const RELATIVE_TIME_UNITS = [
	{ divisor: 60, limit: 60, suffix: "m" },
	{ divisor: 60 * 60, limit: 24, suffix: "h" },
	{ divisor: 60 * 60 * 24, limit: 7, suffix: "d" },
	{ divisor: 60 * 60 * 24 * 7, limit: 5, suffix: "w" },
	{ divisor: 60 * 60 * 24 * 30, limit: 12, suffix: "mo" },
] as const;
export const DEFAULT_PROJECT_EMOJI = "📁";

export const EMPTY_PROJECT_FORM_STATE: ProjectFormState = {
	name: "",
	emoji: DEFAULT_PROJECT_EMOJI,
	description: "",
	repositoryMode: "select",
	selectedRepository: "",
	manualRepository: "",
	lead: "",
	priority: "",
};

export function buildProjectCreateRequest(
	form: ProjectFormState,
	defaults: ProjectCreateDefaults,
	repositories: GitHubRepositoryRecord[] = [],
): ProjectCreateRequest {
	const name = form.name.trim();
	if (!name) {
		throw new Error("Project name is required");
	}
	const repository = resolveRepository(form, repositories);
	return {
		boardId: defaults.boardId,
		ownerId: defaults.ownerId,
		name,
		emoji: optionalText(form.emoji) ?? DEFAULT_PROJECT_EMOJI,
		externalProjectId: null,
		description: optionalText(form.description),
		repoOwner: repository?.owner ?? null,
		repoName: repository?.name ?? null,
		baseBranch: repository?.defaultBranch ?? null,
		localFolder: null,
		lead: optionalText(form.lead),
		category: null,
		priority: optionalPriority(form.priority),
	};
}

export function buildProjectUpdateRequest(
	form: ProjectFormState,
	repositories: GitHubRepositoryRecord[] = [],
): ProjectUpdateRequest {
	const name = form.name.trim();
	if (!name) {
		throw new Error("Project name is required");
	}
	const repository = resolveRepository(form, repositories);
	return {
		name,
		emoji: optionalText(form.emoji) ?? DEFAULT_PROJECT_EMOJI,
		description: optionalText(form.description),
		repoOwner: repository?.owner ?? null,
		repoName: repository?.name ?? null,
		baseBranch: repository?.defaultBranch ?? null,
		lead: optionalText(form.lead),
		priority: optionalPriority(form.priority),
	};
}

export function buildProjectEditFormState(
	project: WorkspaceProjectRecord,
): ProjectFormState {
	const manualRepository =
		project.repoOwner && project.repoName
			? `${project.repoOwner}/${project.repoName}`
			: "";
	return {
		...EMPTY_PROJECT_FORM_STATE,
		name: project.name,
		emoji: project.emoji ?? DEFAULT_PROJECT_EMOJI,
		description: project.description ?? "",
		repositoryMode: "manual",
		manualRepository,
		lead: project.lead ?? "",
		priority: project.priority === null ? "" : String(project.priority),
	};
}

export function filterProjects(
	projects: WorkspaceProjectRecord[],
	searchQuery: string,
): WorkspaceProjectRecord[] {
	const query = searchQuery.trim().toLowerCase();
	if (!query) {
		return projects;
	}
	return projects.filter((project) =>
		projectSearchText(project).toLowerCase().includes(query),
	);
}

export function buildProjectDisplayRows(
	projects: WorkspaceProjectRecord[],
	now = new Date(),
): ProjectDisplayRow[] {
	return projects.map((project) => ({
		project,
		emojiLabel: formatOptionalLabel(project.emoji, DEFAULT_PROJECT_EMOJI),
		priorityLabel: formatProjectPriority(project.priority),
		categoryLabel: formatOptionalLabel(project.category),
		repositoryLabel: formatProjectRepository(project),
		leadLabel: formatOptionalLabel(project.lead),
		createdLabel: formatProjectCreatedAt(project.createdAt, now),
		summaryLabel: formatOptionalLabel(project.description, project.id),
	}));
}

export function formatProjectPriority(priority: number | null): string {
	return priority === null ? EMPTY_LABEL : `P${priority}`;
}

export function formatProjectRepository(
	project: Pick<WorkspaceProjectRecord, "repoName" | "repoOwner">,
): string {
	const owner = project.repoOwner?.trim();
	const repo = project.repoName?.trim();
	return owner && repo ? `${owner}/${repo}` : owner || repo || EMPTY_LABEL;
}

export function formatProjectCreatedAt(
	createdAt: string,
	now = new Date(),
): string {
	const createdDate = new Date(createdAt);
	if (Number.isNaN(createdDate.getTime())) {
		return EMPTY_LABEL;
	}
	const elapsedMs = Math.max(0, now.getTime() - createdDate.getTime());
	const elapsedSeconds = Math.floor(elapsedMs / 1000);
	if (elapsedSeconds < 60) {
		return "Just now";
	}
	for (const unit of RELATIVE_TIME_UNITS) {
		const value = Math.floor(elapsedSeconds / unit.divisor);
		if (value < unit.limit) {
			return `${value}${unit.suffix} ago`;
		}
	}
	return `${Math.floor(elapsedSeconds / (60 * 60 * 24 * 365))}y ago`;
}

function optionalText(value: string): string | null {
	return value.trim() || null;
}

function optionalPriority(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	const priority = Number(trimmed);
	if (!Number.isInteger(priority)) {
		throw new Error("Priority must be a whole number");
	}
	return priority;
}

function resolveRepository(
	form: ProjectFormState,
	repositories: GitHubRepositoryRecord[],
): { owner: string; name: string; defaultBranch: string } | null {
	const trimmed = (
		form.repositoryMode === "manual"
			? form.manualRepository
			: form.selectedRepository
	).trim();
	if (!trimmed) {
		return null;
	}
	const repository = repositories.find(
		(option) => option.nameWithOwner === trimmed,
	);
	if (repository) {
		return {
			owner: repository.owner,
			name: repository.name,
			defaultBranch: repository.defaultBranch ?? "main",
		};
	}
	const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(trimmed);
	if (!match) {
		throw new Error("Repository must be owner/repo");
	}
	return { owner: match[1], name: match[2], defaultBranch: "main" };
}

function formatOptionalLabel(
	value: string | null,
	fallback = EMPTY_LABEL,
): string {
	return value?.trim() || fallback;
}

function projectSearchText(project: WorkspaceProjectRecord): string {
	return `${project.name} ${project.emoji ?? ""} ${project.description ?? ""} ${project.externalProjectId ?? ""} ${project.repoOwner ?? ""} ${project.repoName ?? ""} ${project.baseBranch ?? ""} ${project.localFolder ?? ""} ${project.lead ?? ""} ${project.category ?? ""} ${project.priority ?? ""}`;
}
