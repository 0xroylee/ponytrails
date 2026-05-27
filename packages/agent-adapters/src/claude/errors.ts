import { AgentAdapterError } from "../adapter-error";
import type { AgentAdapterRunRequest } from "../types/agent-adapter.types";

export function mapClaudeError(
	command: string,
	args: string[],
	cwd: string,
	request: AgentAdapterRunRequest,
	result: { code: number; stdout: string; stderr: string },
): Error {
	const output = result.stderr || result.stdout;
	const base = `${command} ${args.join(" ")} failed with exit code ${result.code}`;

	if (output.includes("rate limit") || output.includes("429")) {
		return buildError(
			`${base}\nClaude API rate limit hit. Wait a moment and retry, or set CLAUDE_CODE_MODEL to a model with higher limits.`,
			command,
			args,
			cwd,
			request,
			result,
		);
	}

	if (
		output.includes("authentication") ||
		output.includes("API key") ||
		output.includes("ANTHROPIC_API_KEY")
	) {
		return buildError(
			`${base}\nClaude Code authentication failed. Run 'claude' interactively once to log in, or set ANTHROPIC_API_KEY in your environment.`,
			command,
			args,
			cwd,
			request,
			result,
		);
	}

	if (output.includes("model") && output.includes("not found")) {
		return buildError(
			`${base}\nThe specified model was not found. Check CLAUDE_CODE_MODEL in your .env file.`,
			command,
			args,
			cwd,
			request,
			result,
		);
	}

	if (result.code === 127) {
		return buildError(
			`${base}\nClaude Code binary not found. Install with: npm install -g @anthropic-ai/claude-code`,
			command,
			args,
			cwd,
			request,
			result,
		);
	}

	return buildError(`${base}\n${output}`, command, args, cwd, request, result);
}

function buildError(
	message: string,
	command: string,
	args: string[],
	cwd: string,
	request: AgentAdapterRunRequest,
	result: { code: number; stdout: string; stderr: string },
): AgentAdapterError {
	return new AgentAdapterError({
		backend: "claude-code",
		message,
		command,
		args,
		cwd,
		code: result.code,
		stdout: result.stdout,
		stderr: result.stderr,
		traceId: request.traceId,
	});
}
