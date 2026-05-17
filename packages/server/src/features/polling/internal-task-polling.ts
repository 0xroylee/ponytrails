import type { WorkflowProgressEvent } from "devos/features/server";
import { eq } from "drizzle-orm";
import { type BoardTaskRow, boardTasksTable } from "../../db";
import { normalizeError } from "../../logger";
import {
	createInternalTaskExecutionLog,
	formatStreamLogEvent,
} from "./internal-task-execution-log";
import { recordInternalPolling } from "./internal-task-polling-observability";
import { blockTaskIfStillReady } from "./internal-task-state";
import type {
	InternalTaskPollingScheduler,
	InternalTaskPollingSchedulerDeps,
	InternalTaskPollingSchedulerOptions,
} from "./polling.types";

const READY_STATUS = "todo";

export function startInternalTaskPollingScheduler(
	options: InternalTaskPollingSchedulerOptions,
	deps: InternalTaskPollingSchedulerDeps = {},
): InternalTaskPollingScheduler {
	const intervalMs = options.config.polling.intervalMs;
	const setIntervalFn = deps.setIntervalFn ?? setInterval;
	const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
	let stopped = false;
	let inFlight = false;
	let consecutiveFailures = 0;

	const runTick = async (): Promise<void> => {
		if (stopped) {
			return;
		}
		if (inFlight) {
			await recordInternalPolling(options, {
				eventType: "tick_skipped",
				level: "warn",
				message: "Skipped overlapping internal task polling tick",
				state: "skipped",
			});
			options.logger.info(
				{ intervalMs },
				"Skipping overlapping internal task polling tick",
			);
			return;
		}

		inFlight = true;
		const startedAt = new Date().toISOString();
		let readyTaskCount = 0;
		let dispatchCount = 0;
		try {
			await recordInternalPolling(options, {
				eventType: "tick_started",
				level: "info",
				message: "Internal task polling tick started",
				state: "running",
				startedAt,
			});
			const tasks = await options.db
				.select()
				.from(boardTasksTable)
				.where(eq(boardTasksTable.status, READY_STATUS));
			readyTaskCount = tasks.length;
			for (const task of tasks) {
				if (!task.projectId) {
					continue;
				}
				dispatchCount += 1;
				await recordInternalPolling(options, {
					eventType: "task_dispatched",
					level: "info",
					message: "Internal task dispatched",
					state: "running",
					metadata: { taskId: task.id, taskKey: task.taskKey },
				});
				await runInternalTask(options, task);
			}
			consecutiveFailures = 0;
			await recordInternalPolling(options, {
				eventType: "tick_completed",
				level: "info",
				message: "Internal task polling tick completed",
				state: "success",
				finishedAt: new Date().toISOString(),
				successAt: new Date().toISOString(),
				counts: { readyTaskCount, dispatchCount },
				consecutiveFailures,
				lastError: null,
			});
		} catch (error) {
			consecutiveFailures += 1;
			const message = normalizeError(error).message ?? "Unknown polling error";
			await recordInternalPolling(options, {
				eventType: "tick_failed",
				level: "error",
				message: "Internal task polling tick failed",
				state: "error",
				finishedAt: new Date().toISOString(),
				errorAt: new Date().toISOString(),
				counts: { readyTaskCount, dispatchCount },
				consecutiveFailures,
				lastError: message,
				metadata: { error: message },
			});
			options.logger.error(
				{ intervalMs, err: normalizeError(error) },
				"Internal task polling command failed",
			);
		} finally {
			inFlight = false;
		}
	};

	const intervalHandle = setIntervalFn(() => {
		void runTick();
	}, intervalMs);

	options.logger.info(
		{ intervalMs },
		"Internal task polling scheduler started",
	);
	void recordInternalPolling(options, {
		eventType: "scheduler_started",
		level: "info",
		message: "Internal task polling scheduler started",
		state: "idle",
	});
	void runTick();

	return {
		stop: () => {
			if (stopped) {
				return;
			}
			stopped = true;
			clearIntervalFn(intervalHandle);
			void recordInternalPolling(options, {
				eventType: "scheduler_stopped",
				level: "info",
				message: "Internal task polling scheduler stopped",
				state: "stopped",
				finishedAt: new Date().toISOString(),
			});
			options.logger.info(
				{ intervalMs },
				"Internal task polling scheduler stopped",
			);
		},
	};
}

async function runInternalTask(
	options: InternalTaskPollingSchedulerOptions,
	task: BoardTaskRow,
): Promise<void> {
	const executionLog = await createInternalTaskExecutionLog({
		db: options.db,
		taskId: task.id,
	});
	let appendQueue = Promise.resolve();
	const appendEvent = (event: WorkflowProgressEvent): void => {
		if (event.kind === "log" && !event.message) {
			return;
		}
		appendQueue = appendQueue.then(async () => {
			await executionLog.appendEvent(event);
			options.realtimeEvents?.publish({
				type: "task.execution.event",
				execution: {
					taskId: task.id,
					executionLogId: executionLog.id,
					event,
				},
			});
		});
	};
	const request = {
		action: "run" as const,
		projectId: task.projectId ?? undefined,
		issueKey: task.taskKey,
	};

	try {
		const result = options.cliExecutor.executeStream
			? await options.cliExecutor.executeStream(request, (event) => {
					if (event.type === "stdout" || event.type === "stderr") {
						appendEvent(
							formatStreamLogEvent({ type: event.type, text: event.text }),
						);
					}
					if (event.type === "progress") {
						appendEvent(event.event);
					}
					if (event.type === "error") {
						appendEvent(
							formatStreamLogEvent({ type: "error", error: event.error }),
						);
					}
				})
			: await options.cliExecutor.execute(request);
		if (!options.cliExecutor.executeStream) {
			appendEvent(
				formatStreamLogEvent({
					type: "stdout",
					text: result.commandResult?.stdout ?? "",
				}),
			);
			appendEvent(
				formatStreamLogEvent({
					type: "stderr",
					text: result.commandResult?.stderr ?? "",
				}),
			);
		}
		await appendQueue;
		await executionLog.finish(result);
		if (result.status !== "succeeded") {
			await blockTaskIfStillReady(options, task.id);
			options.logger.error(
				{
					taskKey: task.taskKey,
					projectId: task.projectId,
					status: result.status,
					error: result.error,
				},
				"Internal task polling command returned non-success status",
			);
		}
	} catch (error) {
		await appendQueue.catch(() => undefined);
		await executionLog.fail(error);
		await blockTaskIfStillReady(options, task.id);
		options.logger.error(
			{
				taskKey: task.taskKey,
				projectId: task.projectId,
				err: normalizeError(error),
			},
			"Internal task polling command failed",
		);
	}
}
