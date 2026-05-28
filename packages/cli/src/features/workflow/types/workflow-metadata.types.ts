import type { AgentResult } from "adapters";
import type { AgentSkillReference } from "devos-agents";
import type {
	ResolvedProjectConfig,
	RunState,
	WorkflowStage,
} from "../../types";
import type { WorkflowAgentRole } from "./workflow-agent.types";

export type BuiltInWorkflowPhaseId = "plan" | "implement" | "testing";

export interface WorkflowAgentAssignment {
	name: string;
	role: WorkflowAgentRole;
	required: boolean;
	skills: AgentSkillReference[];
}

export interface WorkflowPhaseDefinition {
	id: BuiltInWorkflowPhaseId;
	title: string;
	stage: WorkflowStage;
	agentAssignments: WorkflowAgentAssignment[];
}

export interface WorkflowMetadata {
	id: string;
	title: string;
	description: string;
	phases: WorkflowPhaseDefinition[];
}

export interface PhaseAgentRunInput {
	config: ResolvedProjectConfig;
	state: RunState;
	phase: WorkflowPhaseDefinition;
	assignment: WorkflowAgentAssignment;
}

export interface PhaseAgentRunResult {
	assignment: WorkflowAgentAssignment;
	result: AgentResult;
}

export type PhaseRunResult =
	| {
			status: "fulfilled";
			phase: WorkflowPhaseDefinition;
			agents: PhaseAgentRunResult[];
	  }
	| {
			status: "rejected";
			phase: WorkflowPhaseDefinition;
			error: string;
	  };

export interface PipelineRunResult {
	ok: boolean;
	phaseResults: PhaseRunResult[];
}
