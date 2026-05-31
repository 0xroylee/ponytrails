"use client";

import { FolderGit, Keyboard, RefreshCw, Search } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import type { GitHubRepositoryRecord } from "@/lib/api";
import type { GitHubConnectionResponse } from "@/lib/api/types/client.types";
import { cn } from "@/lib/utils";

import { Field } from "./project-form-field";
import type {
	ProjectFormState,
	ProjectRepositoryMode,
	RepositorySelectorState,
	RepositorySelectorStateInput,
} from "./types/projects-panel.types";

const LOADING_REPOSITORIES_MESSAGE = "Loading repositories.";
const CONNECTION_UNAVAILABLE_MESSAGE =
	"GitHub connection unavailable; manual entry is still available.";
const OAUTH_UNCONFIGURED_MESSAGE =
	"GitHub OAuth is not configured; manual entry is still available.";
const REPOSITORIES_UNAVAILABLE_MESSAGE =
	"GitHub repositories unavailable; manual entry is still available.";
const NO_REPOSITORIES_MESSAGE =
	"No repositories found; manual entry is still available.";

export function resolveRepositorySelectorState(
	input: RepositorySelectorStateInput,
): RepositorySelectorState {
	if (input.isConnectionLoading)
		return repositoryStatusState(LOADING_REPOSITORIES_MESSAGE);
	if (input.isConnectionError)
		return repositoryRetryState(CONNECTION_UNAVAILABLE_MESSAGE);
	if (!input.connection)
		return repositoryStatusState(LOADING_REPOSITORIES_MESSAGE);
	if (!input.connection.isConfigured)
		return repositoryStatusState(OAUTH_UNCONFIGURED_MESSAGE);
	if (!input.connection.isConnected)
		return repositorySelectorState({
			shouldShowConnect: true,
			statusMessage: "Connect GitHub to list repositories.",
		});
	if (input.isRepositoryLoading)
		return repositoryStatusState(LOADING_REPOSITORIES_MESSAGE);
	if (input.isRepositoryError || input.repositoryUnavailableReason)
		return repositoryRetryState(REPOSITORIES_UNAVAILABLE_MESSAGE);
	if (!input.hasRepositoryOptions)
		return repositoryStatusState(NO_REPOSITORIES_MESSAGE);
	return repositorySelectorState({ canSelectRepository: true });
}

export function RepositoryFields({
	connection,
	form,
	hasRepositoryOptions,
	isConnectionError,
	isConnectionLoading,
	isRepositoryError,
	isRepositoryLoading,
	repositories,
	repositoryUnavailableReason,
	onConnectGitHub,
	onRetryRepositories,
	onUpdateField,
}: {
	connection: GitHubConnectionResponse | undefined;
	form: ProjectFormState;
	hasRepositoryOptions: boolean;
	isConnectionError: boolean;
	isConnectionLoading: boolean;
	isRepositoryError: boolean;
	isRepositoryLoading: boolean;
	repositories: GitHubRepositoryRecord[];
	repositoryUnavailableReason: string | null;
	onConnectGitHub: () => void;
	onRetryRepositories: () => void;
	onUpdateField: (field: keyof ProjectFormState, value: string) => void;
}): ReactElement {
	const selectorState = resolveRepositorySelectorState({
		connection,
		hasRepositoryOptions,
		isConnectionError,
		isConnectionLoading,
		isRepositoryError,
		isRepositoryLoading,
		repositoryUnavailableReason,
	});

	return (
		<fieldset className="grid gap-3 border-0 border-t border-border p-0 pt-4">
			<Typography as="legend" className="mb-1" variant="label">
				GitHub repository
			</Typography>
			<div className="flex flex-wrap gap-2">
				<RepositoryModeButton
					icon={<FolderGit size={15} />}
					isActive={form.repositoryMode === "select"}
					label="Select"
					mode="select"
					onSelect={(mode) => onUpdateField("repositoryMode", mode)}
				/>
				<RepositoryModeButton
					icon={<Keyboard size={15} />}
					isActive={form.repositoryMode === "manual"}
					label="Manual"
					mode="manual"
					onSelect={(mode) => onUpdateField("repositoryMode", mode)}
				/>
			</div>
			{form.repositoryMode === "select" ? (
				<label className="grid gap-1" htmlFor="project-create-repository">
					<span className="sr-only">Repository</span>
					<select
						className="h-10 rounded-md border border-input bg-surface-input px-3 text-sm text-zinc-100 outline-none transition focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-ring"
						disabled={!selectorState.canSelectRepository}
						id="project-create-repository"
						onChange={(event) =>
							onUpdateField("selectedRepository", event.target.value)
						}
						value={form.selectedRepository}
					>
						<option value="">
							{isRepositoryLoading ? "Loading repositories" : "No repository"}
						</option>
						{repositories.map((repository) => (
							<option key={repository.id} value={repository.nameWithOwner}>
								{repository.nameWithOwner}
							</option>
						))}
					</select>
				</label>
			) : (
				<Field
					htmlFor="project-create-manual-repository"
					label="Manual repository"
				>
					<div className="relative">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							size={16}
						/>
						<Input
							className="pl-9"
							id="project-create-manual-repository"
							onChange={(event) =>
								onUpdateField("manualRepository", event.target.value)
							}
							placeholder="owner/repo"
							value={form.manualRepository}
						/>
					</div>
				</Field>
			)}
			{selectorState.shouldShowConnect || selectorState.shouldShowRetry ? (
				<div className="flex flex-wrap gap-2">
					{selectorState.shouldShowConnect ? (
						<Button onClick={onConnectGitHub} size="sm" type="button">
							<FolderGit size={15} />
							Connect GitHub
						</Button>
					) : null}
					{selectorState.shouldShowRetry ? (
						<Button
							onClick={onRetryRepositories}
							size="sm"
							type="button"
							variant="secondary"
						>
							<RefreshCw size={15} />
							Retry
						</Button>
					) : null}
				</div>
			) : null}
			{selectorState.statusMessage ? (
				<Typography variant="description">
					{selectorState.statusMessage}
				</Typography>
			) : null}
		</fieldset>
	);
}

function repositorySelectorState(
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

function repositoryStatusState(statusMessage: string): RepositorySelectorState {
	return repositorySelectorState({ statusMessage });
}

function repositoryRetryState(statusMessage: string): RepositorySelectorState {
	return repositorySelectorState({ shouldShowRetry: true, statusMessage });
}

function RepositoryModeButton({
	icon,
	isActive,
	label,
	mode,
	onSelect,
}: {
	icon: ReactElement;
	isActive: boolean;
	label: string;
	mode: ProjectRepositoryMode;
	onSelect: (mode: ProjectRepositoryMode) => void;
}): ReactElement {
	return (
		<Button
			aria-pressed={isActive}
			className={cn(isActive ? "border-zinc-500 bg-surface-active" : "")}
			onClick={() => onSelect(mode)}
			size="sm"
			type="button"
			variant="outline"
		>
			{icon}
			{label}
		</Button>
	);
}
