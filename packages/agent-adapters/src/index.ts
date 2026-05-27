import { getAgentBackendDefinition } from "./registry";
import type {
	AgentAdapter,
	AgentAdapterRunRequest,
	AgentAdapterRunRole,
	AgentAdapterRuntimeConfig,
	AgentBackend,
	AgentResult,
} from "./types/agent-adapter.types";
export { AgentAdapterError } from "./adapter-error";

export type {
	AgentAdapter,
	AgentAdapterRunRequest,
	AgentAdapterRunRole,
	AgentAdapterRuntimeConfig,
	AgentBackend,
	AgentResult,
	CodexReasoningEffort,
} from "./types/agent-adapter.types";
export type {
	AgentBackendDefinition,
	AgentConfigurationDoc,
	AgentConfigurationDocField,
	AgentConfigurationInput,
	AgentConfigurationResolveOptions,
	AgentModelDefinition,
	AgentStage,
	ResolvedAgentConfiguration,
} from "./types/agent-registry.types";
export {
	agentConfigurationDoc,
	availableAgentModels,
	getAgentBackendDefinition,
	listAgentBackends,
	normalizeAgentBackend,
	resolveAgentConfiguration,
} from "./registry";
export { assertCommandOk, runCommand } from "./shell";
export type { CommandResult, RunCommandOptions } from "./shell";

export function createAgentAdapter(
	config: AgentAdapterRuntimeConfig,
	backend?: AgentBackend,
): AgentAdapter {
	const requestedBackend = backend ?? config.agent?.backend ?? "codex";
	const definition = getAgentBackendDefinition(requestedBackend);
	if (!definition) {
		throw new Error(`Unknown agent backend: ${requestedBackend}`);
	}
	return definition.createAdapter(config);
}

export function runAdapterAgent(
	adapter: AgentAdapter,
	request: AgentAdapterRunRequest,
): Promise<AgentResult> {
	if (adapter.runAgent) {
		return adapter.runAgent(request);
	}
	if (request.sessionId) {
		return adapter.resume(request.sessionId, request.prompt);
	}
	if (request.role === "task-intake") {
		return adapter.runTaskIntake(request.prompt);
	}
	if (request.role === "review-testing") {
		return adapter.runReview(request.prompt);
	}
	if (request.role === "github-comment") {
		return adapter.runGithubComment(request.prompt);
	}
	return adapter.runPlan(request.prompt);
}
