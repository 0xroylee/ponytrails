import type {
	DevosRootConfig,
	ProjectRuntimeConfig,
	ResolvedProjectConfig,
} from "../../features/types";
import { resolveProjects } from "./project-resolution";

const DEFAULT_SERVER_BASE_URL = "http://127.0.0.1:3001";
const PROJECT_METADATA_TIMEOUT_MS = 1000;

interface BoardProjectRow {
	id: string;
	name: string;
	repoOwner: string | null;
	repoName: string | null;
	baseBranch: string | null;
	localFolder: string | null;
}

export async function applyServerProjectMetadata(
	projects: ResolvedProjectConfig[],
	options?: {
		configCwd: string;
		base: ProjectRuntimeConfig;
		root: DevosRootConfig;
	},
): Promise<ResolvedProjectConfig[]> {
	const rows = await fetchServerProjects();
	if (projects.length === 0) {
		return options && rows.length > 0
			? loadServerProjects(options, rows)
			: projects;
	}
	return applyProjectRows(projects, rows);
}

async function loadServerProjects(
	options: {
		configCwd: string;
		base: ProjectRuntimeConfig;
		root: DevosRootConfig;
	},
	rows: BoardProjectRow[],
): Promise<ResolvedProjectConfig[]> {
	const rootWithServerProjects = {
		...options.root,
		projects: rows.map((row) => ({ id: row.id })),
	};
	return applyProjectRows(
		resolveProjects(options.configCwd, options.base, rootWithServerProjects),
		rows,
	);
}

async function fetchServerProjects(): Promise<BoardProjectRow[]> {
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		PROJECT_METADATA_TIMEOUT_MS,
	);
	try {
		const response = await fetch(resolveProjectsUrl(process.env), {
			signal: controller.signal,
		});
		if (!response.ok) {
			return [];
		}
		return parseBoardProjectRows(await response.json());
	} catch {
		return [];
	} finally {
		clearTimeout(timeout);
	}
}

function resolveProjectsUrl(env: NodeJS.ProcessEnv): string {
	const baseUrl = env.DEVOS_SERVER_BASE_URL ?? DEFAULT_SERVER_BASE_URL;
	return new URL("/api/projects", baseUrl).toString();
}

function parseBoardProjectRows(value: unknown): BoardProjectRow[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter(isBoardProjectRow);
}

function isBoardProjectRow(value: unknown): value is BoardProjectRow {
	if (!isRecord(value)) {
		return false;
	}
	return (
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		isNullableString(value.repoOwner) &&
		isNullableString(value.repoName) &&
		isNullableString(value.baseBranch) &&
		isNullableString(value.localFolder)
	);
}

function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === "string";
}

function applyProjectRows(
	projects: ResolvedProjectConfig[],
	rows: BoardProjectRow[],
): ResolvedProjectConfig[] {
	const rowsByProjectId = new Map(rows.map((row) => [row.id, row]));
	return projects.map((project) => {
		const metadata = rowsByProjectId.get(project.id);
		return metadata ? applyProjectRow(project, metadata) : project;
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function applyProjectRow(
	project: ResolvedProjectConfig,
	row: BoardProjectRow,
): ResolvedProjectConfig {
	const localFolder = row.localFolder ?? undefined;
	return {
		...project,
		name: row.name,
		workspacePath: localFolder ?? project.workspacePath,
		executionPath: localFolder ?? project.executionPath,
		repo: {
			owner: row.repoOwner ?? project.repo.owner,
			name: row.repoName ?? project.repo.name,
			baseBranch: row.baseBranch ?? project.repo.baseBranch,
		},
	};
}
