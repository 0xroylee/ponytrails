export function buildPlannerRepairPrompt(
	originalPrompt: string,
	malformedOutput: string,
): string {
	return [
		originalPrompt,
		"",
		"The previous planning response did not follow the required routing contract.",
		"Return only one corrected final planning response using exactly one of:",
		"- PLANNING_RESULT: READY with SUCCESS_GOAL, COMPLEXITY, and COMPLEXITY_SCORE.",
		"- PLANNING_RESULT: NEEDS_INFO with QUESTIONS_JSON when no concise acceptance goal can be stated safely.",
		"For READY, preserve the narrative template headings in order: Title, Summary, Agent Plan, Key Changes, Checkpoints (Steps), Test plan, Assumptions.",
		"For READY, preserve the Agent Plan section with each workflow agent's responsibility.",
		"In Checkpoints (Steps), keep requirement-level progress checkpoints with an implementation target and validation/progress signal.",
		"Do not wrap the full response in a Markdown code fence.",
		"Do not invent a success goal when the requirements are unclear.",
		"",
		"Previous malformed response:",
		malformedOutput.trim() || "(empty)",
	].join("\n");
}
