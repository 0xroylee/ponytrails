import { runCommand } from "../../utils/shell";
import { renderCliHeading } from "../../utils/terminal-format";
import { getCliVersion } from "../../version";
import { instanceConfigPath, sqliteEnvDbPath } from "../config";
import { promptForMissingPluginCredentials } from "../plugins/credentials";
import { clackPromptAdapter } from "../prompts";
import { renderDevosBanner } from "./banner";
import {
	collectOnboardChecks,
	formatOnboardChecks,
	renderOnboardGitHubInstallPrompt,
	renderOnboardRtkInstallPrompt,
} from "./checks";
import { safeRun } from "./checks-helpers";
import { ENV_FILE } from "./constants";
import { loadInstanceConfig, saveInstanceConfig } from "./instance-config";
import { collectOnboardDraft } from "./onboard-draft";
import { writeOnboardFiles } from "./onboard-files";
import type { OnboardWizardDeps } from "./types/onboard.types";

export async function runOnboardWizard(
	cwd: string,
	deps: OnboardWizardDeps = {},
): Promise<void> {
	const commandRunner = deps.runCommand ?? runCommand;
	const prompts = deps.prompts ?? clackPromptAdapter;
	const writeFiles = deps.writeOnboardFiles ?? writeOnboardFiles;
	const collectChecks = deps.collectOnboardChecks ?? collectOnboardChecks;
	const configurePluginCredentials =
		deps.configurePluginCredentials ?? configureInstalledPluginCredentials;
	process.stdout.write(renderOnboardCustomizationIntro());
	const rtk = await safeRun(commandRunner, "rtk", ["--version"], cwd);
	if (rtk.code !== 0) process.stdout.write(renderOnboardRtkInstallPrompt());
	const gh = await safeRun(commandRunner, "gh", ["auth", "status"], cwd);
	if (gh.code !== 0) process.stdout.write(renderOnboardGitHubInstallPrompt());

	const draft = await collectOnboardDraft(cwd, {
		prompts,
		inferGitHubDefaults: deps.inferGitHubDefaults,
	});
	await writeFiles(cwd, draft);
	await configurePluginCredentials(cwd, prompts);
	process.stdout.write(
		`${renderCliHeading("Onboarding files written:")}\n${ENV_FILE}\nInstance config: ${instanceConfigPath()}\nSecrets saved to ${sqliteEnvDbPath(cwd)}\n\n`,
	);
	process.stdout.write(`${renderDevosBanner()}\n`);
	process.stdout.write(`devos v${getCliVersion()}\n`);
	process.stdout.write(`\n${renderCliHeading("Running doctor checks...")}\n`);
	const checks = await collectChecks(cwd);
	process.stdout.write(formatOnboardChecks(checks));
	if (checks.some((check) => check.status === "fail")) {
		throw new Error("Onboard check failed");
	}
	process.stdout.write(`${renderCliHeading("Next command")}\ndevos daemon\n`);
}

function renderOnboardCustomizationIntro(): string {
	return [
		`${renderCliHeading("Customize this workspace")}`,
		"devos onboard will configure:",
		"  - Workspace name and execution path",
		"  - Isolated worktrees",
		"  - Local instance server settings",
		"  - Database, logs, storage, secrets, and telemetry",
		"  - Codex models, reasoning, plugins, skills, sandbox, and hooks",
		"  - Doctor checks after files are written",
		"",
	].join("\n");
}

async function configureInstalledPluginCredentials(
	cwd: string,
	prompts: typeof clackPromptAdapter,
): Promise<void> {
	const result = await loadInstanceConfig(cwd);
	if (!result.ok) return;
	const changed = await promptForMissingPluginCredentials(
		result.config,
		prompts,
	);
	if (changed) {
		await saveInstanceConfig(result.config);
	}
}
