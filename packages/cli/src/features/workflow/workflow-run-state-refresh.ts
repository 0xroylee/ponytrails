import type { RunState } from "../../features/types";
import { normalizeIssueKey } from "./state";
import type { WorkflowIssue } from "./workflow.types";

export interface RunStateIssueIdentityRefresh {
	changed: boolean;
	reusable: boolean;
	discardReason?: "task_id_changed" | "task_not_found_block";
	previousIssueId: string;
	currentIssueId: string;
}

type RunStateIssueIdentityField =
	| "id"
	| "key"
	| "branchName"
	| "title"
	| "description"
	| "url"
	| "projectId"
	| "teamId"
	| "creatorId"
	| "assigneeId"
	| "parentIssue";

const ISSUE_IDENTITY_FIELDS: RunStateIssueIdentityField[] = [
	"id",
	"key",
	"branchName",
	"title",
	"description",
	"url",
	"projectId",
	"teamId",
	"creatorId",
	"assigneeId",
	"parentIssue",
];

export function refreshRunStateIssueIdentity(
	state: RunState,
	issue: WorkflowIssue,
): RunStateIssueIdentityRefresh {
	const previousIssueId = state.issue.id;
	if (!canReuseRunStateForIssue(state, issue)) {
		return {
			changed: false,
			reusable: false,
			discardReason: "task_id_changed",
			previousIssueId,
			currentIssueId: issue.id,
		};
	}
	if (isStaleTaskNotFoundBlock(state)) {
		return {
			changed: false,
			reusable: false,
			discardReason: "task_not_found_block",
			previousIssueId,
			currentIssueId: issue.id,
		};
	}
	const nextIdentity = {
		id: issue.id,
		key: normalizeIssueKey(issue.identifier),
		branchName: issue.branchName,
		title: issue.title,
		description: issue.description,
		url: issue.url,
		projectId: issue.projectId,
		teamId: issue.teamId,
		creatorId: issue.creatorId,
		assigneeId: issue.assigneeId,
		parentIssue: issue.parentIssue,
	};
	const changed = ISSUE_IDENTITY_FIELDS.some(
		(field) => !sameValue(state.issue[field], nextIdentity[field]),
	);
	if (changed) {
		Object.assign(state.issue, nextIdentity);
	}
	return {
		changed,
		reusable: true,
		previousIssueId,
		currentIssueId: state.issue.id,
	};
}

export function canReuseRunStateForIssue(
	state: RunState,
	issue: WorkflowIssue,
): boolean {
	return state.issue.id === issue.id;
}

function isStaleTaskNotFoundBlock(state: RunState): boolean {
	return (
		state.stage === "blocked" &&
		state.lastError?.startsWith("not_found: Task not found") === true
	);
}

function sameValue(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}
