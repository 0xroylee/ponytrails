import type { AgentAdapterRuntimeConfig } from "../../../types/agent-adapter.types";

export function buildCursorNewSessionArgs(
	config: AgentAdapterRuntimeConfig,
	prompt: string,
): string[] {
	return appendCursorOptionalArgs(config, [
		"-p",
		prompt,
		"--output-format",
		"json",
	]);
}

export function buildCursorResumeArgs(
	config: AgentAdapterRuntimeConfig,
	sessionId: string,
	prompt: string,
): string[] {
	return appendCursorOptionalArgs(config, [
		"--resume",
		sessionId,
		"-p",
		prompt,
		"--output-format",
		"json",
	]);
}

export function buildCursorEnv(
	config: AgentAdapterRuntimeConfig,
): Record<string, string> | undefined {
	const apiKey = config.cursor?.apiKey?.trim();
	return apiKey ? { CURSOR_API_KEY: apiKey } : undefined;
}

function appendCursorOptionalArgs(
	config: AgentAdapterRuntimeConfig,
	args: string[],
): string[] {
	const model = config.cursor?.model?.trim();
	if (model && model.toLowerCase() !== "auto") {
		args.push("--model", model);
	}
	if (config.cursor?.force) {
		args.push("--force");
	}
	return args;
}
