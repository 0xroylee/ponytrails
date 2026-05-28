import type { ResolvedProjectConfig, RunState } from "../../types";
import { normalizeIssueKey } from "../state";
import type { Mission } from "../types/mission.types";
import type { WorkflowIssue } from "../types/workflow.types";

export class MissionManager {
	constructor(private readonly config: ResolvedProjectConfig) {}

	createMission(input: {
		issue: WorkflowIssue;
		state: RunState;
		resumed: boolean;
	}): Mission {
		const key = normalizeIssueKey(input.issue.identifier);
		return {
			id: `${this.config.id}:${key}`,
			key,
			projectId: this.config.id,
			issue: input.issue,
			state: input.state,
			resumed: input.resumed,
		};
	}
}
