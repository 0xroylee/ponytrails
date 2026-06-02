import {
	DEFAULT_GITHUB_COMMIT_INSTRUCTION,
	DEFAULT_GITHUB_PR_INSTRUCTION,
	normalizeGithubInstruction,
} from "devos/features/config/github-instructions";
import {
	loadInstanceConfig,
	saveInstanceConfig,
} from "devos/features/onboard/instance-config";
import type { OnboardInstanceConfig } from "devos/features/onboard/types/instance-config.types";
import type {
	SettingsGithubResponse,
	SettingsGithubUpdateRequest,
} from "./types/settings-github.types";

export class SettingsGithubError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "SettingsGithubError";
	}
}

export async function getSettingsGithub(
	cwd: string,
): Promise<SettingsGithubResponse> {
	const config = await readInstanceConfig(cwd);
	return renderSettingsGithub(config);
}

export async function updateSettingsGithub(
	cwd: string,
	request: unknown,
): Promise<SettingsGithubResponse> {
	validateUpdateRequest(request);
	const config = await readInstanceConfig(cwd);
	config.github = {
		commitInstruction:
			normalizeGithubInstruction(request.commitInstruction) ??
			DEFAULT_GITHUB_COMMIT_INSTRUCTION,
		prInstruction:
			normalizeGithubInstruction(request.prInstruction) ??
			DEFAULT_GITHUB_PR_INSTRUCTION,
	};
	await saveInstanceConfig(config);
	return renderSettingsGithub(config);
}

function renderSettingsGithub(
	config: OnboardInstanceConfig,
): SettingsGithubResponse {
	return {
		commitInstruction:
			normalizeGithubInstruction(config.github?.commitInstruction) ??
			DEFAULT_GITHUB_COMMIT_INSTRUCTION,
		prInstruction:
			normalizeGithubInstruction(config.github?.prInstruction) ??
			DEFAULT_GITHUB_PR_INSTRUCTION,
	};
}

async function readInstanceConfig(cwd: string): Promise<OnboardInstanceConfig> {
	const result = await loadInstanceConfig(cwd);
	if (!result.ok) {
		throw new SettingsGithubError(404, result.message);
	}
	return result.config;
}

function validateUpdateRequest(
	request: unknown,
): asserts request is SettingsGithubUpdateRequest {
	if (!isRecord(request)) {
		throw new SettingsGithubError(400, "settings update must be an object");
	}
	validateInstruction(request.commitInstruction, "commitInstruction");
	validateInstruction(request.prInstruction, "prInstruction");
}

function validateInstruction(value: unknown, field: string): void {
	if (value !== undefined && typeof value !== "string") {
		throw new SettingsGithubError(400, `settings ${field} must be a string`);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
