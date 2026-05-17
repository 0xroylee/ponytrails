import { eq } from "drizzle-orm";
import { boardTasksTable } from "../../db";
import type { InternalTaskPollingSchedulerOptions } from "./polling.types";

const READY_STATUS = "todo";

export async function blockTaskIfStillReady(
	options: InternalTaskPollingSchedulerOptions,
	taskId: string,
): Promise<void> {
	const [task] = await options.db
		.select({ status: boardTasksTable.status })
		.from(boardTasksTable)
		.where(eq(boardTasksTable.id, taskId));
	if (task?.status !== READY_STATUS) {
		return;
	}
	await options.db
		.update(boardTasksTable)
		.set({ status: "blocked", updatedAt: new Date().toISOString() })
		.where(eq(boardTasksTable.id, taskId));
}
