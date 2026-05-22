export function mapCursorError(
	command: string,
	args: string[],
	result: { code: number; stdout: string; stderr: string },
): Error {
	const output = result.stderr || result.stdout;
	const base = `${command} ${args.join(" ")} failed with exit code ${result.code}`;

	if (
		result.code === 127 ||
		output.includes("command not found") ||
		output.includes("ENOENT")
	) {
		return new Error(
			`${base}\nCursor Agent binary not found. Install Cursor Agent CLI and run 'cursor-agent login', or set CURSOR_AGENT_BINARY.`,
		);
	}
	if (
		output.includes("authentication") ||
		output.includes("API key") ||
		output.includes("CURSOR_API_KEY") ||
		output.includes("login")
	) {
		return new Error(
			`${base}\nCursor Agent authentication failed. Run 'cursor-agent login' or set CURSOR_API_KEY.`,
		);
	}
	if (output.includes("rate limit") || output.includes("429")) {
		return new Error(`${base}\nCursor Agent rate limit hit. Retry later.`);
	}
	if (output.includes("model") && output.includes("not found")) {
		return new Error(
			`${base}\nThe specified Cursor Agent model was not found. Check CURSOR_AGENT_MODEL.`,
		);
	}

	return new Error(`${base}\n${output}`);
}
