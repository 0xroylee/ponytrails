import type { ResolvedProjectConfig, RunState } from "../../features/types";
import { logger, normalizeError } from "../../utils/logger";
import {
	type WorkflowProgressEvent,
	addWorkflowProgressListener,
} from "../server";
import { createReliableWorkflowDataClient } from "./reliable-workflow-data-client";
import type { WorkflowDataAction } from "./workflow-data-protocol";

type ExecutionFinishStatus = "succeeded" | "failed" | "blocked";

export interface WorkflowExecutionRecorder {
	executionLogId: string;
	start(): Promise<void>;
	finish(status: ExecutionFinishStatus): Promise<void>;
}

export function createWorkflowExecutionRecorder(
	config: ResolvedProjectConfig,
	state: RunState,
): WorkflowExecutionRecorder {
	const executionLogId = crypto.randomUUID();
	const client = createReliableWorkflowDataClient({
		context: { workspacePath: config.workspacePath, projectId: config.id },
	});
	let sequence = 0;
	let tail = Promise.resolve();
	let unsubscribe: (() => void) | undefined;
	let disabled = false;

	const enqueue = (action: WorkflowDataAction, payload: unknown): void => {
		tail = tail
			.then(() => client.request(action, payload))
			.then(
				() => undefined,
				() => undefined,
			);
	};

	return {
		executionLogId,
		async start() {
			try {
				await client.request("taskExecutions.start", {
					executionLogId,
					taskId: state.issue.id,
					projectId: state.projectId,
					issueKey: state.issue.key,
					startedAt: new Date().toISOString(),
				});
			} catch (error) {
				if (!isTaskNotFound(error)) {
					throw error;
				}
				disabled = true;
				logger.warn(
					{
						projectId: state.projectId,
						issueKey: state.issue.key,
						err: normalizeError(error),
					},
					"Task execution logging disabled because server task was not found",
				);
				return;
			}
			unsubscribe = addWorkflowProgressListener((event) => {
				if (!matchesRunState(event, state)) {
					return;
				}
				sequence += 1;
				if (event.kind === "log") {
					enqueue("taskExecutions.appendStream", {
						executionLogId,
						eventId: eventId(executionLogId, sequence),
						stream: event.stream,
						text: event.message,
						emittedAt: event.emittedAt,
					});
					return;
				}
				enqueue("taskExecutions.recordProgress", {
					executionLogId,
					eventId: eventId(executionLogId, sequence),
					stepNumber: sequence,
					event,
				});
			});
		},
		async finish(status) {
			if (disabled) {
				return;
			}
			unsubscribe?.();
			await tail;
			await client.request("taskExecutions.finish", {
				executionLogId,
				status,
				finishedAt: new Date().toISOString(),
			});
		},
	};
}

function matchesRunState(
	event: WorkflowProgressEvent,
	state: RunState,
): boolean {
	if (event.projectId !== state.projectId) {
		return false;
	}
	return event.issueKey === state.issue.key;
}

function eventId(executionLogId: string, sequence: number): string {
	return `${executionLogId}:${String(sequence).padStart(6, "0")}`;
}

function isTaskNotFound(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.startsWith("not_found: Task not found");
}
