import { access } from "node:fs/promises";
import path from "node:path";
import type { LoadedConfig } from "../config";
import { DEFAULT_CONFIG_FILE } from "./constants";
import type { InstanceConfigLoadResult } from "./instance-config.types";
import type { SetupCheck, SetupCheckDeps } from "./setup.types";

interface ConfigFileCheckOptions {
	cwd: string;
	configLoader: NonNullable<SetupCheckDeps["loadConfig"]>;
	instanceLoader: NonNullable<SetupCheckDeps["loadInstanceConfig"]>;
	accessPath?: SetupCheckDeps["access"];
}

export async function collectConfigFileCheck({
	cwd,
	configLoader,
	instanceLoader,
	accessPath = access,
}: ConfigFileCheckOptions): Promise<{
	check: SetupCheck;
	config?: LoadedConfig;
	instanceResult: InstanceConfigLoadResult;
}> {
	const configPath = path.join(cwd, DEFAULT_CONFIG_FILE);
	const [configExists, configResult, instanceResult] = await Promise.all([
		pathExists(configPath, accessPath),
		loadConfigForCheck(cwd, configLoader),
		instanceLoader(cwd),
	]);

	return {
		check: buildConfigFileCheck(configExists, configResult, instanceResult),
		config: configResult.ok ? configResult.config : undefined,
		instanceResult,
	};
}

function buildConfigFileCheck(
	configExists: boolean,
	configResult:
		| { ok: true; config: LoadedConfig }
		| { ok: false; message: string },
	instanceResult: InstanceConfigLoadResult,
): SetupCheck {
	if (!configResult.ok) return fail(configResult.message);
	if (!instanceResult.ok) return fail(instanceResult.message);
	return {
		name: "Instance config",
		status: "pass",
		message: configExists
			? `instance config and ${DEFAULT_CONFIG_FILE} loaded successfully`
			: `instance config loaded successfully; ${DEFAULT_CONFIG_FILE} not present`,
	};
}

async function pathExists(
	targetPath: string,
	accessPath: NonNullable<SetupCheckDeps["access"]>,
): Promise<boolean> {
	try {
		await accessPath(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function loadConfigForCheck(
	cwd: string,
	configLoader: NonNullable<SetupCheckDeps["loadConfig"]>,
): Promise<
	{ ok: true; config: LoadedConfig } | { ok: false; message: string }
> {
	try {
		return { ok: true, config: await configLoader(cwd) };
	} catch (error) {
		return {
			ok: false,
			message: error instanceof Error ? error.message : String(error),
		};
	}
}

function fail(message: string): SetupCheck {
	return { name: "Instance config", status: "fail", message };
}
