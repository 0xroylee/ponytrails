import type { ResolvedProjectConfig } from "../../features/types";
import type {
	BoardTaskCreateInput,
	BoardTaskPullRequestLink,
	BoardTaskUpdateInput,
	BoardTaskWorkflowRecord,
	BoardTaskWorkflowStore,
} from "./board-task-workflow-store.types";
import { createReliableWorkflowDataClient } from "./reliable-workflow-data-client";
import type {
	WorkflowBoardTaskRecord,
	WorkflowPullRequestRecord,
} from "./workflow-data-protocol";

export function createBoardTaskWorkflowStore(
	config: ResolvedProjectConfig,
): BoardTaskWorkflowStore {
	const client = createReliableWorkflowDataClient({
		context: { workspacePath: config.workspacePath, projectId: config.id },
	});
	return {
		async listTasks() {
			const tasks =
				await client.request<WorkflowBoardTaskRecord[]>("tasks.list");
			return tasks.map(toWorkflowRecord);
		},
		async updateTask(taskId, values) {
			await client.request<WorkflowBoardTaskRecord>("tasks.update", {
				taskId,
				values,
			} satisfies { taskId: string; values: BoardTaskUpdateInput });
		},
		async createTask(input) {
			return client.request<WorkflowBoardTaskRecord>(
				"tasks.createWorkflowTask",
				input satisfies BoardTaskCreateInput,
			);
		},
		async addComment(taskId, body) {
			await client.request<WorkflowBoardTaskRecord>("tasks.addComment", {
				taskId,
				body,
				commentId: crypto.randomUUID(),
			});
		},
		async linkPullRequest(input) {
			await client.request<WorkflowBoardTaskRecord>(
				"tasks.linkPullRequest",
				input satisfies BoardTaskPullRequestLink,
			);
		},
	};
}

function toWorkflowRecord(
	task: WorkflowBoardTaskRecord,
): BoardTaskWorkflowRecord {
	return {
		task,
		pullRequest: toPullRequest(task.pullRequest),
	};
}

function toPullRequest(
	pullRequest: WorkflowPullRequestRecord | undefined,
): WorkflowPullRequestRecord | undefined {
	return pullRequest;
}
