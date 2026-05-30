import { desc, eq } from "devos-db";
import type { ServerDatabase } from "devos-db";
import { taskExecutionLogsTable } from "devos-db";

const WORKFLOW_IDLE_POLL_INTERVAL_MS = 1000;

export async function waitForTaskWorkflowIdle(
	db: ServerDatabase["db"],
	taskId: string,
): Promise<void> {
	while (await isLatestTaskExecutionRunning(db, taskId)) {
		await sleep(WORKFLOW_IDLE_POLL_INTERVAL_MS);
	}
}

async function isLatestTaskExecutionRunning(
	db: ServerDatabase["db"],
	taskId: string,
): Promise<boolean> {
	const [latest] = await db
		.select({ status: taskExecutionLogsTable.status })
		.from(taskExecutionLogsTable)
		.where(eq(taskExecutionLogsTable.taskId, taskId))
		.orderBy(desc(taskExecutionLogsTable.startedAt))
		.limit(1);
	return latest?.status === "running";
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
