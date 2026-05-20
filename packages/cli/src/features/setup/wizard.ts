import readline from "node:readline/promises";
import { runCommand } from "../../utils/shell";
import {
	renderSetupGitHubInstallPrompt,
	renderSetupRtkInstallPrompt,
} from "./checks";
import { safeRun } from "./checks-helpers";
import {
	DEFAULT_BASE_BRANCH,
	DEFAULT_LABEL_MAP,
	DEFAULT_PROJECT_NAME,
	DEFAULT_REASONING_EFFORTS,
	DEFAULT_STATUS_MAP,
	ENV_FILE,
	INSTANCE_CONFIG_FILE,
	LINEAR_API_KEY_SETTINGS_URL,
	LOCAL_CONFIG_FILE,
} from "./constants";
import { normalizeProjectId } from "./normalize";
import { writeSetupFiles } from "./setup-files";
import type { SetupDraft } from "./setup.types";
import {
	ask,
	emptyToUndefined,
	inferGitHubDefaults,
	normalizeReasoningEffort,
	normalizeSandbox,
	parseRecipients,
	parseYesNo,
	resolveUserPath,
} from "./wizard-helpers";

export async function runSetupWizard(cwd: string): Promise<void> {
	const io = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const rtk = await safeRun(runCommand, "rtk", ["--version"], cwd);
		if (rtk.code !== 0) process.stdout.write(renderSetupRtkInstallPrompt());
		const gh = await safeRun(runCommand, "gh", ["auth", "status"], cwd);
		if (gh.code !== 0) process.stdout.write(renderSetupGitHubInstallPrompt());

		const projectName = await ask(io, "Project name", DEFAULT_PROJECT_NAME);
		const projectId = await ask(
			io,
			"Project ID",
			normalizeProjectId(projectName),
		);
		const executionPath = resolveUserPath(
			await ask(io, "Local repository path", cwd),
		);
		const defaults = await inferGitHubDefaults(executionPath);
		const repoOwner = await ask(io, "GitHub owner", defaults.owner ?? "");
		const repoName = await ask(
			io,
			"GitHub repository name",
			defaults.name ?? "",
		);
		const baseBranch = await ask(
			io,
			"GitHub base branch",
			defaults.baseBranch ?? DEFAULT_BASE_BRANCH,
		);
		const linearApiKey = await ask(
			io,
			`Linear API key (create one: ${LINEAR_API_KEY_SETTINGS_URL})`,
			"",
		);
		const linearProjectId = emptyToUndefined(
			await ask(io, "Linear project ID filter (optional)", ""),
		);
		const linearTeamId = emptyToUndefined(
			await ask(
				io,
				"Linear team ID filter (optional; inferred from project when possible)",
				"",
			),
		);
		const enableEmailNotifications = parseYesNo(
			await ask(io, "Enable email notifications? (y/N)", "N"),
		);
		const resendApiKey = enableEmailNotifications
			? emptyToUndefined(await ask(io, "Resend API key", ""))
			: undefined;
		const resendFrom = enableEmailNotifications
			? emptyToUndefined(await ask(io, "Resend sender email", ""))
			: undefined;
		const resendTo = enableEmailNotifications
			? parseRecipients(
					await ask(io, "Resend recipients (comma-separated)", ""),
				)
			: [];
		const statusMap = {
			backlog: await ask(io, "Status for backlog", DEFAULT_STATUS_MAP.backlog),
			assigned: await ask(
				io,
				"Status for assigned work",
				DEFAULT_STATUS_MAP.assigned,
			),
			planning: await ask(
				io,
				"Status while planning",
				DEFAULT_STATUS_MAP.planning,
			),
			implementing: await ask(
				io,
				"Status while implementing",
				DEFAULT_STATUS_MAP.implementing,
			),
			pr_created: await ask(
				io,
				"Status after PR is created",
				DEFAULT_STATUS_MAP.pr_created,
			),
			reviewing: await ask(
				io,
				"Status while reviewing",
				DEFAULT_STATUS_MAP.reviewing,
			),
			testing: await ask(
				io,
				"Status while testing",
				DEFAULT_STATUS_MAP.testing,
			),
			blocked: await ask(io, "Status when blocked", DEFAULT_STATUS_MAP.blocked),
			done: await ask(io, "Status when done", DEFAULT_STATUS_MAP.done),
		};
		const sandbox = normalizeSandbox(
			await ask(io, "Codex sandbox", "workspace-write"),
		);
		const planModel = await ask(io, "Planning model", "gpt-5.5");
		const implementModel = await ask(
			io,
			"Implementation model",
			"gpt-5.3-codex",
		);
		const reviewModel = await ask(io, "Review/testing model", "gpt-5.3-codex");
		const planReasoningEffort = normalizeReasoningEffort(
			await ask(
				io,
				"Planning reasoning effort",
				DEFAULT_REASONING_EFFORTS.plan,
			),
			DEFAULT_REASONING_EFFORTS.plan,
		);
		const implementReasoningEffort = normalizeReasoningEffort(
			await ask(
				io,
				"Implementation reasoning effort",
				DEFAULT_REASONING_EFFORTS.implement,
			),
			DEFAULT_REASONING_EFFORTS.implement,
		);
		const reviewReasoningEffort = normalizeReasoningEffort(
			await ask(
				io,
				"Review/testing reasoning effort",
				DEFAULT_REASONING_EFFORTS.reviewTest,
			),
			DEFAULT_REASONING_EFFORTS.reviewTest,
		);
		const enablePlugins = parseYesNo(
			await ask(io, "Enable GitHub and Linear Codex plugins? (Y/n)", "Y"),
		);

		const draft: SetupDraft = {
			projectId: normalizeProjectId(projectId),
			projectName: projectName.trim() || DEFAULT_PROJECT_NAME,
			workspacePath: executionPath,
			executionPath,
			repoOwner,
			repoName,
			baseBranch,
			linearApiKey,
			linearProjectId,
			linearTeamId,
			notifications: {
				email: {
					enabled: enableEmailNotifications,
					resendApiKey,
					from: resendFrom,
					to: resendTo,
				},
			},
			statusMap,
			labelMap: DEFAULT_LABEL_MAP,
			codex: {
				reasoningEfforts: {
					plan: planReasoningEffort,
					implement: implementReasoningEffort,
					reviewTest: reviewReasoningEffort,
					githubComment: reviewReasoningEffort,
				},
				models: {
					plan: planModel,
					implement: implementModel,
					reviewTest: reviewModel,
					githubComment: reviewModel,
				},
				plugins: enablePlugins
					? ["github@openai-curated", "linear@openai-curated"]
					: [],
				skillsets: ["devos"],
				configOverrides: { "features.codex_hooks": "true" },
				sandbox,
			},
		};

		await writeSetupFiles(cwd, draft);
		process.stdout.write(
			`Onboarding files written: ${ENV_FILE}, ${LOCAL_CONFIG_FILE}, ${INSTANCE_CONFIG_FILE}; secrets saved to .devos/config/env.sqlite\nRun 'devos onboard --check' to validate this machine.\n`,
		);
	} finally {
		io.close();
	}
}
