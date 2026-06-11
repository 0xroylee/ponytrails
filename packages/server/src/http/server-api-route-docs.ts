import { READ_ONLY_SERVER_PATHS } from "../routes";
import { doc } from "./api-docs";
import {
	chatRouteDocs,
	entityCrudRouteDocs,
	githubRepositoryRouteDocs,
	projectRouteDocs,
	taskRouteDocs,
} from "./server-api-route-doc-groups";
import type { ApiRouteDoc } from "./types/api-docs.types";

const workspaceProjectParams = ["workspaceId", "projectId"];

export const apiRouteDocs = {
	health: [doc("GET", "/health", "Health", "Check server health.")],
	workspaceCurrent: [
		doc(
			"GET",
			"/api/workspace/current",
			"Workspace",
			"Read the active workspace identity.",
		),
	],
	workspaceEnvironment: [
		doc(
			"GET",
			"/api/workspace/environment",
			"Workspace",
			"Read workspace filesystem and MCP environment status.",
			{ queryParams: ["projectId"] },
		),
	],
	cli: [
		doc(
			"GET",
			"/api/cli/history",
			"CLI",
			"List in-memory CLI execution history.",
		),
		doc(
			"GET",
			"/api/computers",
			"CLI",
			"List registered workflow worker computers.",
		),
	],
	github: [
		doc(
			"GET",
			"/api/github/repositories/search",
			"GitHub",
			"Search GitHub repositories.",
			{ queryParams: ["q"] },
		),
	],
	githubRepositories: githubRepositoryRouteDocs,
	chat: chatRouteDocs,
	pollingStatus: [
		doc(
			"GET",
			"/api/polling/status",
			"Polling",
			"Read polling runtime status.",
		),
	],
	projects: projectRouteDocs,
	tasks: taskRouteDocs,
	inbox: [
		doc("GET", "/api/inbox/messages", "Inbox", "List inbox messages.", {
			queryParams: ["workspaceId", "userId", "runId"],
		}),
		doc("POST", "/api/inbox/messages", "Inbox", "Create an inbox message.", {
			requestBody: "Inbox message create payload.",
		}),
	],
	workspaceBoard: [
		doc(
			"GET",
			"/api/workspaces/{workspaceId}/projects",
			"Workspace",
			"List projects in a workspace.",
			{ pathParams: ["workspaceId"] },
		),
		doc(
			"GET",
			"/api/workspaces/{workspaceId}/projects/{projectId}/board",
			"Workspace",
			"Read a workspace project board.",
			{ pathParams: workspaceProjectParams },
		),
	],
	settings: [
		doc("GET", "/api/settings/github", "Settings", "Read GitHub settings."),
		doc(
			"PATCH",
			"/api/settings/github",
			"Settings",
			"Update GitHub settings.",
			{
				requestBody: "GitHub settings update payload.",
			},
		),
		doc("GET", "/api/settings/models", "Settings", "Read model settings."),
		doc("PATCH", "/api/settings/models", "Settings", "Update model settings.", {
			requestBody: "Model settings update payload.",
		}),
	],
	entityCrud: entityCrudRouteDocs,
	notifications: [
		doc(
			"POST",
			"/api/notifications",
			"Notifications",
			"Send an internal server notification.",
			{ requestBody: "Notification server request." },
		),
		doc(
			"POST",
			"/api/notifications/email",
			"Notifications",
			"Send an email notification.",
			{ requestBody: "Notification email request." },
		),
	],
	readOnly: READ_ONLY_SERVER_PATHS.map((path) =>
		doc(
			"GET",
			path,
			"Read Models",
			`Read ${path.replace("/api/", "").replaceAll("-", " ")} rows.`,
		),
	),
} satisfies Record<string, ApiRouteDoc[]>;
