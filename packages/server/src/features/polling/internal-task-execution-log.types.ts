import type {
	CliCommandExecutionResult,
	WorkflowProgressEvent,
} from "devos/features/server";
import type { ServerDatabase } from "../../db";

export type InternalTaskExecutionLogStatus = "running" | "success" | "failed";

export interface InternalTaskExecutionLogWriter {
	id: string;
	append(text: string): Promise<void>;
	appendEvent(event: WorkflowProgressEvent): Promise<void>;
	finish(result: CliCommandExecutionResult): Promise<void>;
	fail(error: unknown): Promise<void>;
}

export interface InternalTaskExecutionLogInput {
	db: ServerDatabase["db"];
	taskId: string;
	now?: () => string;
	idFactory?: () => string;
}
