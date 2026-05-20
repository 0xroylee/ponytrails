import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { saveSqliteEnv } from "../config";
import { ENV_FILE, INSTANCE_CONFIG_FILE, LOCAL_CONFIG_FILE } from "./constants";
import { buildEnvUpdates, mergeEnvFile } from "./env-file";
import { renderInstanceConfig } from "./instance-config";
import { renderLocalConfig } from "./local-config";
import type { SetupDraft } from "./setup.types";
import { readExistingFile } from "./wizard-helpers";

export async function writeSetupFiles(
	cwd: string,
	draft: SetupDraft,
): Promise<void> {
	const envPath = path.join(cwd, ENV_FILE);
	const configPath = path.join(cwd, LOCAL_CONFIG_FILE);
	const instanceConfigPath = path.join(cwd, INSTANCE_CONFIG_FILE);
	const existingEnv = await readExistingFile(envPath);
	await writeFile(envPath, mergeEnvFile(existingEnv, buildEnvUpdates(draft)));
	await saveSqliteEnv(cwd, {
		LINEAR_API_KEY: draft.linearApiKey,
		RESEND_API_KEY: draft.notifications.email.resendApiKey,
	});
	await writeFile(configPath, renderLocalConfig(draft));
	await mkdir(path.dirname(instanceConfigPath), { recursive: true });
	await writeFile(instanceConfigPath, renderInstanceConfig(cwd));
}
