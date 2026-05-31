import { describe, expect, it } from "bun:test";
import { resolveRepositorySelectorState } from "../src/components/projects/project-create-dialog-fields";
import {
	DEFAULT_PROJECT_EMOJI,
	EMPTY_PROJECT_FORM_STATE,
	buildProjectCreateRequest,
	buildProjectUpdateRequest,
} from "../src/components/projects/projects-panel-utils";
import type {
	ProjectFormState,
	RepositorySelectorState,
	RepositorySelectorStateInput,
} from "../src/components/projects/types/projects-panel.types";
import type { GitHubRepositoryRecord } from "../src/lib/api";

const defaults = { boardId: "board-1", ownerId: "owner-1" };
const connected = {
	isConfigured: true,
	isConnected: true,
	login: "octo",
	unavailableReason: null,
};
const CONNECTION_UNAVAILABLE =
	"GitHub connection unavailable; manual entry is still available.";
const OAUTH_UNCONFIGURED =
	"GitHub OAuth is not configured; manual entry is still available.";
const REPOSITORIES_UNAVAILABLE =
	"GitHub repositories unavailable; manual entry is still available.";
const NO_REPOSITORIES =
	"No repositories found; manual entry is still available.";

describe("projects panel utils", () => {
	it("builds project requests from manual and selected repositories", () => {
		const manual = buildProjectCreateRequest(
			projectForm({
				name: "  Web Project  ",
				emoji: "🧭",
				description: "  Created from UI  ",
				repositoryMode: "manual",
				manualRepository: "  octo/demo  ",
			}),
			defaults,
		);
		const selected = buildProjectCreateRequest(
			projectForm({
				name: "Web Project",
				repositoryMode: "select",
				selectedRepository: "octo/core",
			}),
			defaults,
			[
				repositoryOption({
					name: "core",
					nameWithOwner: "octo/core",
					defaultBranch: "trunk",
				}),
			],
		);

		expect(manual).toMatchObject({
			name: "Web Project",
			emoji: "🧭",
			description: "Created from UI",
			repoOwner: "octo",
			repoName: "demo",
			baseBranch: "main",
		});
		expect(selected).toMatchObject({
			repoOwner: "octo",
			repoName: "core",
			baseBranch: "trunk",
		});
		expect(() =>
			buildProjectCreateRequest(projectForm({ name: " " }), defaults),
		).toThrow("Project name is required");
		expect(() =>
			buildProjectCreateRequest(
				projectForm({
					name: "Web Project",
					repositoryMode: "manual",
					manualRepository: "https://github.com/octo/demo",
				}),
				defaults,
			),
		).toThrow("Repository must be owner/repo");
	});

	it("normalizes update fields and validates priority", () => {
		const updated = buildProjectUpdateRequest(
			projectForm({
				name: "  Web Project Updated  ",
				emoji: "🚀",
				description: "  Edited from UI  ",
				repositoryMode: "select",
				selectedRepository: "octo/core",
				lead: "  Roy  ",
				priority: "3",
			}),
			[repositoryOption({ name: "core", nameWithOwner: "octo/core" })],
		);
		const cleared = buildProjectUpdateRequest(
			projectForm({
				name: "Web Project",
				emoji: " ",
				description: " ",
				repositoryMode: "manual",
				manualRepository: " ",
				lead: " ",
				priority: " ",
			}),
		);

		expect(updated).toMatchObject({
			name: "Web Project Updated",
			emoji: "🚀",
			description: "Edited from UI",
			repoOwner: "octo",
			repoName: "core",
			lead: "Roy",
			priority: 3,
		});
		expect(cleared).toMatchObject({
			emoji: DEFAULT_PROJECT_EMOJI,
			description: null,
			repoOwner: null,
			repoName: null,
			priority: null,
		});
		expect(() =>
			buildProjectUpdateRequest(
				projectForm({ name: "Web Project", priority: "high" }),
			),
		).toThrow("Priority must be a whole number");
	});

	it("resolves GitHub connection and repository loading states", () => {
		expectSelectorStatus(
			{ connection: undefined, isConnectionError: true },
			CONNECTION_UNAVAILABLE,
			{ shouldShowRetry: true },
		);
		expectSelectorStatus({ connection: disconnected() }, OAUTH_UNCONFIGURED);
		expectSelectorStatus(
			{ connection: { ...connected, isConnected: false, login: null } },
			"Connect GitHub to list repositories.",
			{ shouldShowConnect: true },
		);
		expectSelectorStatus(
			{ isRepositoryLoading: true },
			"Loading repositories.",
		);
		expectSelector(
			{ hasRepositoryOptions: true },
			{ canSelectRepository: true },
		);
		expectSelectorStatus(
			{ isRepositoryError: true },
			REPOSITORIES_UNAVAILABLE,
			{ shouldShowRetry: true },
		);
		expectSelectorStatus({}, NO_REPOSITORIES);
	});
});

function projectForm(overrides: Partial<ProjectFormState>): ProjectFormState {
	return { ...EMPTY_PROJECT_FORM_STATE, ...overrides };
}

function repositoryOption(
	overrides: Partial<GitHubRepositoryRecord> = {},
): GitHubRepositoryRecord {
	return {
		id: "octo/demo",
		owner: "octo",
		name: "demo",
		nameWithOwner: "octo/demo",
		defaultBranch: "main",
		isPrivate: false,
		...overrides,
	};
}

function expectSelector(
	inputOverrides: Partial<RepositorySelectorStateInput>,
	expectedOverrides: Partial<RepositorySelectorState>,
): void {
	expect(resolveRepositorySelectorState(selectorInput(inputOverrides))).toEqual(
		selectorState(expectedOverrides),
	);
}

function expectSelectorStatus(
	inputOverrides: Partial<RepositorySelectorStateInput>,
	statusMessage: string,
	expectedOverrides: Partial<RepositorySelectorState> = {},
): void {
	expectSelector(inputOverrides, { ...expectedOverrides, statusMessage });
}

function disconnected(): RepositorySelectorStateInput["connection"] {
	return {
		isConfigured: false,
		isConnected: false,
		login: null,
		unavailableReason: "GitHub OAuth is not configured",
	};
}

function selectorInput(
	overrides: Partial<RepositorySelectorStateInput>,
): RepositorySelectorStateInput {
	return {
		connection: connected,
		hasRepositoryOptions: false,
		isConnectionError: false,
		isConnectionLoading: false,
		isRepositoryLoading: false,
		isRepositoryError: false,
		repositoryUnavailableReason: null,
		...overrides,
	};
}

function selectorState(
	overrides: Partial<RepositorySelectorState>,
): RepositorySelectorState {
	return {
		canSelectRepository: false,
		shouldShowConnect: false,
		shouldShowRetry: false,
		statusMessage: null,
		...overrides,
	};
}
