import type { RunState } from "../../types";
import type { IssueLogger } from "./issue-processing.types";

export type IssueExecutionStatus = "succeeded" | "failed";

export interface IssueExecutionRecorder {
	finish(status: IssueExecutionStatus): Promise<void>;
}

export interface IssueExecutionFinalizerInput {
	executionRecorder: IssueExecutionRecorder;
	executionRecorderStarted: boolean;
	executionStatus: IssueExecutionStatus;
	leaseAcquired: boolean;
	isolatedWorktreesEnabled: boolean;
	runState: RunState;
	issueLogger: IssueLogger;
}
