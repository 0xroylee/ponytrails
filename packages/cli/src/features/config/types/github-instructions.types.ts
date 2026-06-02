export interface GithubInstructionsConfig {
	commitInstruction?: string;
	prInstruction?: string;
}

export interface GithubInstructionContext {
	baseBranch: string;
	branch: string;
	issueKey: string;
	issueTitle: string;
}
