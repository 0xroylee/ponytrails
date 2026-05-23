import { access } from "node:fs/promises";
import { runCommand } from "../../utils/shell";
import { loadConfig, loadResolvedEnv } from "../config";
import type { LoadedConfig } from "../config";
import { addBinaryChecks } from "./checks-binaries";
import { collectConfigFileCheck } from "./checks-config-file";
import { collectInstanceSetupChecks } from "./checks-instance";
import { loadInstanceConfig } from "./instance-config";
import type { SetupCheck, SetupCheckDeps } from "./setup.types";

export async function collectSetupChecks(
	cwd: string,
	deps: SetupCheckDeps = {},
): Promise<SetupCheck[]> {
	const configLoader = deps.loadConfig ?? loadConfig;
	const envLoader = deps.loadResolvedEnv ?? loadResolvedEnv;
	const instanceLoader = deps.loadInstanceConfig ?? loadInstanceConfig;
	const commandRunner = deps.runCommand ?? runCommand;
	const accessPath = deps.access ?? access;
	const checks: SetupCheck[] = [];

	const { check, config, instanceResult } = await collectConfigFileCheck({
		cwd,
		configLoader,
		instanceLoader,
	});
	checks.push(check);
	const env = await loadEnvForChecks(envLoader, cwd);
	checks.push(
		...(await collectInstanceSetupChecks({
			env,
			instanceResult,
			mkdir: deps.mkdir,
			canBindPort: deps.canBindPort,
		})),
	);
	if (!config) return checks;

	await addProjectPathChecks(checks, config, accessPath);
	await addSkillChecks(checks, config, accessPath);
	await addAutoSelectChecks(checks, config, accessPath);
	await addBinaryChecks(checks, config, commandRunner, cwd);
	return checks;
}

async function loadEnvForChecks(
	envLoader: NonNullable<SetupCheckDeps["loadResolvedEnv"]>,
	cwd: string,
): Promise<Record<string, string | undefined>> {
	try {
		return await envLoader(cwd);
	} catch {
		return {};
	}
}

async function addProjectPathChecks(
	checks: SetupCheck[],
	config: LoadedConfig,
	accessPath: NonNullable<SetupCheckDeps["access"]>,
): Promise<void> {
	for (const project of config.projects) {
		try {
			await accessPath(project.executionPath);
			checks.push({
				name: `Execution path (${project.id})`,
				status: "pass",
				message: project.executionPath,
			});
		} catch {
			checks.push({
				name: `Execution path (${project.id})`,
				status: "fail",
				message: `${project.executionPath} does not exist or is not accessible`,
			});
		}
	}
}

async function addSkillChecks(
	checks: SetupCheck[],
	config: LoadedConfig,
	accessPath: NonNullable<SetupCheckDeps["access"]>,
): Promise<void> {
	for (const project of config.projects) {
		const skillChecks: Array<[string, string]> = [
			["plan", project.skills.plan],
			["implement", project.skills.implement],
			["reviewTest", project.skills.reviewTest],
			["githubComment", project.skills.githubComment],
			["createTask", project.skills.createTask ?? ""],
		];
		for (const [stage, skillPath] of skillChecks) {
			try {
				await accessPath(skillPath);
				checks.push({
					name: `Skill file (${project.id}:${stage})`,
					status: "pass",
					message: skillPath,
				});
			} catch {
				checks.push({
					name: `Skill file (${project.id}:${stage})`,
					status: "fail",
					message: `${skillPath} does not exist or is not accessible`,
				});
			}
		}
	}
}

async function addAutoSelectChecks(
	checks: SetupCheck[],
	config: LoadedConfig,
	accessPath: NonNullable<SetupCheckDeps["access"]>,
): Promise<void> {
	for (const project of config.projects) {
		const autoSelect = project.skills.autoSelect;
		if (!autoSelect?.enabled) continue;

		if (autoSelect.sources.folder) {
			try {
				await accessPath(project.skills.root);
				checks.push({
					name: `Skill auto-select folder (${project.id})`,
					status: "pass",
					message: project.skills.root,
				});
			} catch {
				checks.push({
					name: `Skill auto-select folder (${project.id})`,
					status: "fail",
					message: `${project.skills.root} does not exist or is not accessible`,
				});
			}
		}
		if (autoSelect.sources.database) {
			const databasePath = autoSelect.databasePath?.trim();
			if (!databasePath) {
				checks.push({
					name: `Skill auto-select database (${project.id})`,
					status: "fail",
					message:
						"skills.autoSelect.databasePath is required when database source is enabled",
				});
				continue;
			}
			try {
				await accessPath(databasePath);
				checks.push({
					name: `Skill auto-select database (${project.id})`,
					status: "pass",
					message: databasePath,
				});
			} catch {
				checks.push({
					name: `Skill auto-select database (${project.id})`,
					status: "fail",
					message: `${databasePath} does not exist or is not accessible`,
				});
			}
		}
	}
}
