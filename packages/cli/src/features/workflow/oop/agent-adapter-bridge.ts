import {
	type AgentAdapter,
	type AgentAdapterRunRole,
	type AgentResult,
	runAdapterAgent,
} from "adapters";
import type { AgentRunInput, AgentSkillReference } from "devos-agents";
import { Agent, SandboxAgent } from "devos-agents";
import type { ResolvedProjectConfig } from "../../types";

export type WorkflowAgentRole =
	| "planning"
	| "implementing"
	| "review-testing"
	| "github-comment";

export interface WorkflowAgentBridgeInput {
	role: WorkflowAgentRole;
	prompt: string;
	sessionId?: string;
	customInstructions?: string;
	skills?: AgentSkillReference[];
	skillsets?: string[];
}

export class AgentAdapterBridge {
	constructor(
		private readonly adapter: AgentAdapter,
		private readonly config: ResolvedProjectConfig,
	) {}

	createAgent(
		role: WorkflowAgentRole,
	): Agent<WorkflowAgentBridgeInput, AgentResult> {
		const options = {
			name: role,
			instructions: `Run the ${role} workflow role for devos.ing.`,
			runner: {
				run: async (runInput: AgentRunInput<WorkflowAgentBridgeInput>) => {
					const output = await this.runRole(runInput);
					return {
						output,
						finalMessage: output.finalMessage || output.stdout,
						sessionId: output.sessionId,
						traceId: output.traceId,
						usage: output.usage,
					};
				},
			},
		};
		if (role === "implementing" || role === "review-testing") {
			return new SandboxAgent({
				...options,
				workspacePath: this.config.executionPath,
				sandbox: this.config.codex.sandbox,
			});
		}
		return new Agent(options);
	}

	private runRole(
		runInput: AgentRunInput<WorkflowAgentBridgeInput>,
	): Promise<AgentResult> {
		const input = runInput.input;
		if (input.role === "implementing") {
			if (!input.sessionId) {
				throw new Error("Implementing agent requires a session id");
			}
		}
		return runAdapterAgent(this.adapter, {
			role: toAdapterRole(input.role),
			prompt: input.prompt,
			sessionId: input.sessionId,
			traceId: runInput.traceId,
			agent: runInput.agent,
			customInstructions:
				input.customInstructions ?? runInput.customInstructions,
			skills: input.skills ?? runInput.skills,
			skillsets: input.skillsets ?? runInput.skillsets,
			onStream: runInput.onStream,
		});
	}
}

function toAdapterRole(role: WorkflowAgentRole): AgentAdapterRunRole {
	return role === "review-testing" ? "review-testing" : role;
}
