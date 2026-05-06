import type { BugRecord } from "./types";

export interface TokenUsage {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
}

export function formatCodexUsageLine(usage?: TokenUsage): string {
	if (!usage) {
		return "Token usage: unknown";
	}
	const input = usage.inputTokens ?? "unknown";
	const output = usage.outputTokens ?? "unknown";
	const total =
		usage.totalTokens ??
		(typeof usage.inputTokens === "number" &&
		typeof usage.outputTokens === "number"
			? usage.inputTokens + usage.outputTokens
			: "unknown");
	return `Token usage: input ${input}, output ${output}, total ${total}`;
}

export function buildPlanComment(
	issueKey: string,
	planSummary: string,
	usage?: TokenUsage,
): string {
	const maxSummaryLength = 6000;
	const normalized = planSummary.trim();
	const truncated =
		normalized.length > maxSummaryLength
			? `${normalized.slice(0, maxSummaryLength)}\n\n[truncated]`
			: normalized;

	return [
		`PIV loop plan for ${issueKey}`,
		"",
		"Planning completed; implementation started.",
		"",
		formatCodexUsageLine(usage),
		"",
		"Plan:",
		truncated || "(No plan summary returned by planning agent.)",
	].join("\n");
}

export function buildImplementationComment(
	draftPrUrl: string | undefined,
	usage?: TokenUsage,
): string {
	return [
		`Implementation completed. Draft PR: ${draftPrUrl ?? "(created)"}`,
		formatCodexUsageLine(usage),
	].join("\n");
}

export function buildReviewComment(input: {
	issueKey: string;
	passed: boolean;
	summary: string;
	usage?: TokenUsage;
	bugs: BugRecord[];
}): string {
	return [
		`PIV loop review for ${input.issueKey}`,
		"",
		`Result: ${input.passed ? "PASS" : "FAIL"}`,
		"",
		formatCodexUsageLine(input.usage),
		"",
		input.summary,
		"",
		input.bugs.length > 0
			? "Bugs were detected and converted to GitHub issues."
			: "No bugs found.",
	].join("\n");
}

export function buildBugsCanceledComment(bugs: BugRecord[]): string {
	return [
		"Review/testing found bugs. Moved issue to Canceled.",
		...bugs.map(
			(bug) => `- ${bug.title}${bug.issueUrl ? ` (${bug.issueUrl})` : ""}`,
		),
	].join("\n");
}
