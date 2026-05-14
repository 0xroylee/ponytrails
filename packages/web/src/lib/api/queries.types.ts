export interface ServerStateQueryOptions {
	enabled?: boolean;
}

export interface WorkspaceProjectsQueryOptions extends ServerStateQueryOptions {
	workspaceId: string | null;
}

export interface ProjectBoardQueryOptions extends ServerStateQueryOptions {
	workspaceId: string | null;
	projectId: string | null;
}
