import { AgentAdapterError } from "../adapter-error";
import type { AgentAdapterRunRequest } from "../types/agent-adapter.types";

interface CursorErrorContext {
	cwd?: string;
	request?: AgentAdapterRunRequest;
}

export function mapCursorError(
	command: string,
	args: string[],
	result: { code: number; stdout: string; stderr: string },
	context: CursorErrorContext = {},
): Error {
	const output = result.stderr || result.stdout;
	const base = `${command} ${args.join(" ")} failed with exit code ${result.code}`;

	if (
		result.code === 127 ||
		output.includes("command not found") ||
		output.includes("ENOENT")
	) {
		return buildError(
			`${base}\nCursor Agent binary not found. Install Cursor Agent CLI and run 'cursor-agent login', or set CURSOR_AGENT_BINARY.`,
			command,
			args,
			result,
			context,
		);
	}
	if (
		output.includes("authentication") ||
		output.includes("API key") ||
		output.includes("CURSOR_API_KEY") ||
		output.includes("login")
	) {
		return buildError(
			`${base}\nCursor Agent authentication failed. Run 'cursor-agent login' or set CURSOR_API_KEY.`,
			command,
			args,
			result,
			context,
		);
	}
	if (output.includes("rate limit") || output.includes("429")) {
		return buildError(
			`${base}\nCursor Agent rate limit hit. Retry later.`,
			command,
			args,
			result,
			context,
		);
	}
	if (output.includes("model") && output.includes("not found")) {
		return buildError(
			`${base}\nThe specified Cursor Agent model was not found. Check CURSOR_AGENT_MODEL.`,
			command,
			args,
			result,
			context,
		);
	}

	return buildError(`${base}\n${output}`, command, args, result, context);
}

function buildError(
	message: string,
	command: string,
	args: string[],
	result: { code: number; stdout: string; stderr: string },
	context: CursorErrorContext,
): AgentAdapterError {
	return new AgentAdapterError({
		backend: "cursor-agent",
		message,
		command,
		args,
		cwd: context.cwd,
		code: result.code,
		stdout: result.stdout,
		stderr: result.stderr,
		traceId: context.request?.traceId,
	});
}
