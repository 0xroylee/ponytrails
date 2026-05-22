export function extractFinalMessage(jsonOutput: string): string {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		return typeof parsed.result === "string" ? parsed.result : jsonOutput;
	} catch {}
	return jsonOutput;
}

export function extractSessionId(jsonOutput: string): string | undefined {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		const id = parsed.session_id ?? parsed.sessionId;
		return typeof id === "string" ? id : undefined;
	} catch {}
	return undefined;
}
