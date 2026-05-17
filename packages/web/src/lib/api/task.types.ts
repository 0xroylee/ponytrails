import type { WorkspaceProjectRecord } from "./client.types";

export interface ProjectBoardTaskRecord {
	id: string;
	taskKey: string;
	projectId: string | null;
	title: string;
	content: string;
	priority: number;
	status: string;
	dueDate: string | null;
	creatorId: string;
	assigneeId: string | null;
	linkedPr: string | null;
	linearIssueId: string | null;
	linearIdentifier: string | null;
	linearUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ProjectBoardRecord {
	project: WorkspaceProjectRecord;
	statusColumns: ProjectBoardStatusColumn[];
}

export interface ProjectBoardStatusColumn {
	status: string;
	tasks: ProjectBoardTaskRecord[];
}

export interface TaskMutationRequest {
	projectId?: string | null;
	title: string;
	content: string;
	priority: number;
	status: string;
	creatorId: string;
	assigneeId?: string | null;
	dueDate?: string | null;
	linkedPr?: string | null;
}

export interface TaskCreateAnswer {
	question: string;
	answer: string;
}

export interface TaskCreateRequest {
	request: string;
	projectId?: string;
	answers?: TaskCreateAnswer[];
}

export type TaskCreateResponse =
	| {
			status: "created";
			task: ProjectBoardTaskRecord;
	  }
	| {
			status: "needs_info";
			questions: string[];
	  }
	| { status: "db_error"; error: string };
