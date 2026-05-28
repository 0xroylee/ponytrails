import type { LoadedConfig } from "../config";
import type { InstanceConfigLoadResult } from "./types/instance-config.types";
import type { OnboardCheck, OnboardCheckDeps } from "./types/onboard.types";

interface ConfigFileCheckOptions {
	cwd: string;
	configLoader: NonNullable<OnboardCheckDeps["loadConfig"]>;
	instanceLoader: NonNullable<OnboardCheckDeps["loadInstanceConfig"]>;
}

export async function collectConfigFileCheck({
	cwd,
	configLoader,
	instanceLoader,
}: ConfigFileCheckOptions): Promise<{
	check: OnboardCheck;
	config?: LoadedConfig;
	instanceResult: InstanceConfigLoadResult;
}> {
	const [configResult, instanceResult] = await Promise.all([
		loadConfigForCheck(cwd, configLoader),
		instanceLoader(cwd),
	]);

	return {
		check: buildConfigFileCheck(configResult, instanceResult),
		config: configResult.ok ? configResult.config : undefined,
		instanceResult,
	};
}

function buildConfigFileCheck(
	configResult:
		| { ok: true; config: LoadedConfig }
		| { ok: false; message: string },
	instanceResult: InstanceConfigLoadResult,
): OnboardCheck {
	if (!configResult.ok) return fail(configResult.message);
	if (!instanceResult.ok) return fail(instanceResult.message);
	return {
		name: "Instance config",
		status: "pass",
		message: "instance config loaded successfully",
	};
}

async function loadConfigForCheck(
	cwd: string,
	configLoader: NonNullable<OnboardCheckDeps["loadConfig"]>,
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

function fail(message: string): OnboardCheck {
	return { name: "Instance config", status: "fail", message };
}
