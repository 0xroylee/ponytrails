import {
	SettingsGithubError,
	getSettingsGithub,
	updateSettingsGithub,
} from "../settings/settings-github-service";
import {
	SettingsModelsError,
	getSettingsModels,
	updateSettingsModels,
} from "../settings/settings-models-service";
import { jsonError, jsonSuccess, methodNotAllowedResponse } from "./response";

const SETTINGS_MODELS_PATH = "/api/settings/models";
const SETTINGS_GITHUB_PATH = "/api/settings/github";

export async function handleSettingsRoute(
	request: Request,
	pathname: string,
	workspacePath: string,
): Promise<Response | null> {
	if (pathname !== SETTINGS_MODELS_PATH && pathname !== SETTINGS_GITHUB_PATH) {
		return null;
	}
	try {
		if (pathname === SETTINGS_GITHUB_PATH) {
			if (request.method === "GET") {
				return jsonSuccess(await getSettingsGithub(workspacePath));
			}
			if (request.method === "PATCH") {
				return jsonSuccess(
					await updateSettingsGithub(
						workspacePath,
						await parseJsonBody(request),
					),
				);
			}
			return methodNotAllowedResponse();
		}
		if (request.method === "GET") {
			return jsonSuccess(await getSettingsModels(workspacePath));
		}
		if (request.method === "PATCH") {
			return jsonSuccess(
				await updateSettingsModels(workspacePath, await parseJsonBody(request)),
			);
		}
		return methodNotAllowedResponse();
	} catch (error) {
		if (error instanceof SettingsGithubError) {
			return jsonError(error.message, { status: error.status });
		}
		if (error instanceof SettingsModelsError) {
			return jsonError(error.message, { status: error.status });
		}
		throw error;
	}
}

async function parseJsonBody(request: Request): Promise<unknown> {
	try {
		return (await request.json()) as unknown;
	} catch {
		throw new SettingsModelsError(400, "request body must be JSON");
	}
}
