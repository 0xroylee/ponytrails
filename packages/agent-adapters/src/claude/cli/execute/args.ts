import type { AgentAdapterRuntimeConfig } from "../../../types/agent-adapter.types";

export function buildClaudeNewSessionArgs(
	config: AgentAdapterRuntimeConfig,
	prompt: string,
): string[] {
	return ["-p", prompt, ...buildClaudeCommonArgs(config)];
}

export function buildClaudeResumeArgs(
	config: AgentAdapterRuntimeConfig,
	sessionId: string,
	prompt: string,
): string[] {
	return [
		"--resume",
		sessionId,
		"-p",
		prompt,
		...buildClaudeCommonArgs(config),
	];
}

export function buildClaudeCommonArgs(
	config: AgentAdapterRuntimeConfig,
): string[] {
	const permissionMode =
		config.claude?.permissionMode ??
		config.agent?.permissionMode ??
		"bypassPermissions";
	return [
		"--output-format",
		"json",
		"--permission-mode",
		permissionMode,
		...buildClaudeModelArgs(config),
		...buildClaudeMaxTurnsArgs(config),
		...buildClaudeAllowedToolsArgs(config),
	];
}

function buildClaudeModelArgs(config: AgentAdapterRuntimeConfig): string[] {
	const model = config.claude?.model ?? config.agent?.model;
	return model ? ["--model", model] : [];
}

function buildClaudeMaxTurnsArgs(config: AgentAdapterRuntimeConfig): string[] {
	const maxTurns = config.claude?.maxTurns ?? config.agent?.maxTurns;
	return maxTurns && maxTurns > 0 ? ["--max-turns", String(maxTurns)] : [];
}

function buildClaudeAllowedToolsArgs(
	config: AgentAdapterRuntimeConfig,
): string[] {
	const tools = config.claude?.allowedTools ?? config.agent?.allowedTools;
	return tools && tools.length > 0 ? ["--allowedTools", ...tools] : [];
}
