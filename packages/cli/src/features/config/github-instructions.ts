import type {
	GithubInstructionContext,
	GithubInstructionsConfig,
} from "./types/github-instructions.types";

export const DEFAULT_GITHUB_COMMIT_INSTRUCTION =
	"[devos] {issueKey}: {issueTitle}";

export const DEFAULT_GITHUB_PR_INSTRUCTION = [
	"Workflow task: {issueKey}",
	"",
	"This PR was created by the devos.ing ADHD (Agentic Development Hub & Daemon) workflow.",
	"",
	"Includes:",
	"- plan + implement session output",
	"- separate review/testing session",
].join("\n");

export function normalizeGithubInstructionsConfig(
	value: Record<string, unknown>,
): GithubInstructionsConfig | undefined {
	const commitInstruction = normalizeGithubInstruction(value.commitInstruction);
	const prInstruction = normalizeGithubInstruction(value.prInstruction);
	if (!commitInstruction && !prInstruction) {
		return undefined;
	}
	return {
		...(commitInstruction ? { commitInstruction } : {}),
		...(prInstruction ? { prInstruction } : {}),
	};
}

export function normalizeGithubInstruction(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

export function renderGithubInstruction(
	template: string | undefined,
	context: GithubInstructionContext,
	defaultTemplate: string,
): string {
	const source = normalizeGithubInstruction(template) ?? defaultTemplate;
	return source.replace(
		/\{(baseBranch|branch|issueKey|issueTitle)\}/g,
		(_match, key: keyof GithubInstructionContext) => context[key],
	);
}
