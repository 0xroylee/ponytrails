import type {
	CommandHistoryRecord,
	ProjectBoardRecord,
	ProjectBoardTaskRecord,
} from "@/lib/api";

import { getStatusLabel } from "@/components/issues-board/issues-board-utils";

import type {
	CommandSearchGroup,
	CommandSearchResult,
} from "./command-search-dialog.types";
import type { SidebarNavItem } from "./web-shell.types";

const MAX_ISSUE_RESULTS = 8;
const MAX_HISTORY_RESULTS = 6;

export function buildCommandSearchGroups({
	board,
	commandHistory,
	navItems,
	query,
}: {
	board: ProjectBoardRecord | undefined;
	commandHistory: CommandHistoryRecord[] | undefined;
	navItems: SidebarNavItem[];
	query: string;
}): CommandSearchGroup[] {
	const normalizedQuery = normalizeSearchText(query);
	return [
		{
			id: "commands",
			label: "Commands",
			results: filterResults(
				[buildNewIssueAction(), ...navItems.map(buildNavigationResult)],
				normalizedQuery,
			),
		},
		{
			id: "issues",
			label: "Issues",
			results: filterResults(
				flattenTasks(board).map(buildIssueResult),
				normalizedQuery,
			).slice(0, MAX_ISSUE_RESULTS),
		},
		{
			id: "history",
			label: "Recent Commands",
			results: filterResults(
				(commandHistory ?? []).map(buildHistoryResult),
				normalizedQuery,
			).slice(0, MAX_HISTORY_RESULTS),
		},
	].filter((group) => group.results.length > 0);
}

function buildNewIssueAction(): CommandSearchResult {
	return {
		id: "action:new-issue",
		kind: "action",
		label: "New Issue",
		detail: "Create an issue",
		action: "newIssue",
	};
}

function buildNavigationResult(item: SidebarNavItem): CommandSearchResult {
	return {
		id: `nav:${item.key}`,
		kind: "navigation",
		label: item.label,
		detail: "Open section",
		navKey: item.key,
	};
}

function buildIssueResult(task: ProjectBoardTaskRecord): CommandSearchResult {
	return {
		id: `issue:${task.id}`,
		kind: "issue",
		label: task.title,
		detail: `${task.id} · ${getStatusLabel(task.status)} · P${task.priority}`,
		task,
	};
}

function buildHistoryResult(record: CommandHistoryRecord): CommandSearchResult {
	return {
		id: `history:${record.id}`,
		kind: "history",
		label: record.command,
		detail: `Copy command · exit ${record.exitCode}`,
		command: record.command,
	};
}

function flattenTasks(
	board: ProjectBoardRecord | undefined,
): ProjectBoardTaskRecord[] {
	return (
		board?.statusColumns.flatMap((column) =>
			column.tasks.map((task) => ({
				...task,
				status: task.status || column.status,
			})),
		) ?? []
	);
}

function filterResults(
	results: CommandSearchResult[],
	normalizedQuery: string,
): CommandSearchResult[] {
	if (!normalizedQuery) {
		return results;
	}
	return results.filter((result) => resultMatches(result, normalizedQuery));
}

function resultMatches(
	result: CommandSearchResult,
	normalizedQuery: string,
): boolean {
	return normalizeSearchText(
		`${result.label} ${result.detail} ${extraText(result)}`,
	).includes(normalizedQuery);
}

function extraText(result: CommandSearchResult): string {
	if (result.kind === "issue") {
		return `${result.task.id} ${result.task.content} ${result.task.creatorId}`;
	}
	if (result.kind === "history") {
		return result.command;
	}
	if (result.kind === "navigation") {
		return result.navKey;
	}
	return result.action;
}

function normalizeSearchText(value: string): string {
	return value.trim().toLowerCase();
}
