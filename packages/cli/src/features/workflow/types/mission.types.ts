import type { ResolvedProjectConfig, RunOptions, RunState } from "../../types";
import type {
	PollingSettings,
	WorkflowIssue,
	WorkflowLinearClient,
} from "./workflow.types";

export interface Mission {
	id: string;
	key: string;
	projectId: string;
	issue: WorkflowIssue;
	state: RunState;
	resumed: boolean;
}

export interface MissionCycleInput {
	project: ResolvedProjectConfig;
	linear: WorkflowLinearClient;
	options: RunOptions;
	polling: PollingSettings;
}

export interface MissionQueue {
	issues: WorkflowIssue[];
	staleRetryCount: number;
}
