import { eq, inArray, or } from "devos-db";
import type { ServerDatabase } from "devos-db";
import {
	inboxMessagesTable,
	taskAssigneesTable,
	taskCommentsTable,
	taskExecutionLogsTable,
	taskExecutionStepsTable,
	taskPullRequestsTable,
	taskTagsTable,
	tokenUsageTable,
} from "devos-db";

export async function deleteTaskRelations(
	db: Pick<ServerDatabase["db"], "delete">,
	taskId: string,
): Promise<void> {
	await db
		.delete(taskAssigneesTable)
		.where(eq(taskAssigneesTable.taskId, taskId));
	await db
		.delete(taskCommentsTable)
		.where(eq(taskCommentsTable.taskId, taskId));
	await db.delete(taskTagsTable).where(eq(taskTagsTable.taskId, taskId));
	await db
		.delete(taskPullRequestsTable)
		.where(eq(taskPullRequestsTable.taskId, taskId));
	await db
		.delete(inboxMessagesTable)
		.where(eq(inboxMessagesTable.taskId, taskId));
}

export async function deleteTaskExecutionRecords(
	db: Pick<ServerDatabase["db"], "delete" | "select">,
	taskId: string,
): Promise<void> {
	const executionLogs = await db
		.select({ id: taskExecutionLogsTable.id })
		.from(taskExecutionLogsTable)
		.where(eq(taskExecutionLogsTable.taskId, taskId));
	const executionLogIds = executionLogs.map((log) => log.id);
	await deleteTaskTokenUsage(db, taskId, executionLogIds);
	if (executionLogIds.length > 0) {
		await db
			.delete(taskExecutionStepsTable)
			.where(inArray(taskExecutionStepsTable.executionLogId, executionLogIds));
	}
	await db
		.delete(taskExecutionLogsTable)
		.where(eq(taskExecutionLogsTable.taskId, taskId));
}

async function deleteTaskTokenUsage(
	db: Pick<ServerDatabase["db"], "delete">,
	taskId: string,
	executionLogIds: string[],
): Promise<void> {
	const tokenUsageFilter =
		executionLogIds.length > 0
			? or(
					eq(tokenUsageTable.taskId, taskId),
					inArray(tokenUsageTable.taskExecutionLogId, executionLogIds),
				)
			: eq(tokenUsageTable.taskId, taskId);
	await db.delete(tokenUsageTable).where(tokenUsageFilter);
}
