import type { PriorityOption, StatusPresentation } from "./issues-board.types";

export const DEFAULT_WORKSPACE_ID = "owner-1";
export const DEFAULT_CREATOR_ID = "member-1";

export const STATUS_ORDER = [
	"planning",
	"todo",
	"implementing",
	"reviewing",
	"testing",
	"done",
] as const;

export const STATUS_PRESENTATION: Record<string, StatusPresentation> = {
	planning: {
		label: "Backlog",
		tone: "border-[color:var(--status-neutral-border)] bg-[color:var(--status-neutral-bg)]",
	},
	todo: {
		label: "To Do",
		tone: "border-[color:var(--status-neutral-border)] bg-[color:var(--status-neutral-bg)]",
	},
	implementing: {
		label: "In Progress",
		tone: "border-[color:var(--status-implementing-border)] bg-[color:var(--status-implementing-bg)]",
	},
	reviewing: {
		label: "In Review",
		tone: "border-[color:var(--status-reviewing-border)] bg-[color:var(--status-reviewing-bg)]",
	},
	testing: {
		label: "Testing",
		tone: "border-[color:var(--status-testing-border)] bg-[color:var(--status-testing-bg)]",
	},
	done: {
		label: "Done",
		tone: "border-[color:var(--status-done-border)] bg-[color:var(--status-done-bg)]",
	},
};

export const PRIORITY_OPTIONS: readonly PriorityOption[] = [
	{ value: 1, label: "Urgent" },
	{ value: 2, label: "High" },
	{ value: 3, label: "Medium" },
	{ value: 4, label: "Low" },
	{ value: 0, label: "No priority" },
];
