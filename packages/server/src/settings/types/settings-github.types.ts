export interface SettingsGithubResponse {
	commitInstruction: string;
	prInstruction: string;
}

export interface SettingsGithubUpdateRequest {
	commitInstruction?: string;
	prInstruction?: string;
}
