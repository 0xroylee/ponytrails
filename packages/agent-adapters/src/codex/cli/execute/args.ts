import type {
	AgentAdapterRunRequest,
	AgentAdapterRuntimeConfig,
	CodexReasoningEffort,
} from "../../../types/agent-adapter.types";
import { buildCodexConfigOverrides } from "../skills/config-overrides";

interface CodexArgsInput {
	config: AgentAdapterRuntimeConfig;
	request: AgentAdapterRunRequest;
	prompt: string;
	outputFile: string;
	modelOverride?: string;
	reasoningEffortOverride?: CodexReasoningEffort;
	fastModeEnabled?: boolean;
}

export function buildCodexExecArgs(input: CodexArgsInput): string[] {
	const args = [
		"exec",
		"--json",
		"--skip-git-repo-check",
		"--cd",
		input.config.executionPath,
		"--output-last-message",
		input.outputFile,
	];
	appendCodexModelAndRuntimeArgs(args, input);
	args.push(input.prompt);
	return args;
}

export function buildCodexResumeArgs(input: CodexArgsInput): string[] {
	const args = [
		"exec",
		"resume",
		"--json",
		"--skip-git-repo-check",
		"--output-last-message",
		input.outputFile,
	];
	appendCodexModelAndRuntimeArgs(args, input);
	args.push(input.request.sessionId ?? "", input.prompt);
	return args;
}

function appendCodexModelAndRuntimeArgs(
	args: string[],
	input: CodexArgsInput,
): void {
	const model = input.modelOverride ?? input.config.codex.model;
	if (model) {
		args.push("--model", model);
	}
	if (
		input.config.codex.sandbox &&
		args[0] === "exec" &&
		args[1] !== "resume"
	) {
		args.push("--sandbox", input.config.codex.sandbox);
	}
	for (const override of buildCodexConfigOverrides(
		input.config,
		input.request,
		input.reasoningEffortOverride,
		input.fastModeEnabled,
	)) {
		args.push("--config", override);
	}
}
