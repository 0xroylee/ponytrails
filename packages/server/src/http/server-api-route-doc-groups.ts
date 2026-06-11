import { doc } from "./api-docs";
import type { ApiRouteDoc } from "./types/api-docs.types";

const idParam = ["id"];
const sessionIdParam = ["id"];

export const githubRepositoryRouteDocs = [
	doc(
		"GET",
		"/api/github/connection",
		"GitHub",
		"Read stored GitHub connection status.",
	),
	doc(
		"DELETE",
		"/api/github/connection",
		"GitHub",
		"Disconnect the stored GitHub account.",
	),
	doc(
		"GET",
		"/api/github/oauth/start",
		"GitHub",
		"Start the GitHub OAuth flow.",
	),
	doc(
		"GET",
		"/api/github/oauth/callback",
		"GitHub",
		"Complete the GitHub OAuth flow.",
	),
	doc(
		"POST",
		"/api/github/device/start",
		"GitHub",
		"Start the GitHub device authorization flow.",
		{ requestBody: "Device flow start request." },
	),
	doc(
		"POST",
		"/api/github/device/poll",
		"GitHub",
		"Poll the GitHub device authorization flow.",
		{ requestBody: "Device polling request." },
	),
	doc(
		"GET",
		"/api/github/repositories",
		"GitHub",
		"List repositories for the connected GitHub account.",
	),
];

export const chatRouteDocs = [
	doc("GET", "/api/chat/sessions", "Chat", "List chat sessions.", {
		queryParams: ["workspaceId"],
	}),
	doc("POST", "/api/chat/sessions", "Chat", "Create a chat session.", {
		requestBody: "Chat session create payload.",
	}),
	doc("PATCH", "/api/chat/sessions/{id}", "Chat", "Update a chat session.", {
		pathParams: sessionIdParam,
		requestBody: "Chat session update payload.",
	}),
	doc("DELETE", "/api/chat/sessions/{id}", "Chat", "Archive a chat session.", {
		pathParams: sessionIdParam,
	}),
	doc(
		"GET",
		"/api/chat/sessions/{id}/status",
		"Chat",
		"Read chat session status.",
		{ pathParams: sessionIdParam },
	),
	doc(
		"GET",
		"/api/chat/sessions/{id}/messages",
		"Chat",
		"List chat session messages.",
		{ pathParams: sessionIdParam },
	),
	doc(
		"POST",
		"/api/chat/sessions/{id}/messages",
		"Chat",
		"Append a chat session message.",
		{
			pathParams: sessionIdParam,
			requestBody: "Chat message create payload.",
		},
	),
	doc(
		"POST",
		"/api/chat/sessions/{id}/send",
		"Chat",
		"Queue a chat send request.",
		{
			pathParams: sessionIdParam,
			requestBody: "Chat send payload.",
			response: "Accepted send status.",
		},
	),
];

export const projectRouteDocs = [
	doc("GET", "/api/projects", "Board", "List projects."),
	doc("POST", "/api/projects", "Board", "Create a project.", {
		requestBody: "Project create payload.",
	}),
	doc("GET", "/api/projects/{id}", "Board", "Read a project.", {
		pathParams: idParam,
	}),
	doc("PATCH", "/api/projects/{id}", "Board", "Update a project.", {
		pathParams: idParam,
		requestBody: "Project update payload.",
	}),
	doc("DELETE", "/api/projects/{id}", "Board", "Delete a project.", {
		pathParams: idParam,
	}),
];

export const taskRouteDocs = [
	doc("GET", "/api/tasks", "Tasks", "List board tasks."),
	doc("POST", "/api/tasks", "Tasks", "Create a board task.", {
		requestBody: "Task create payload.",
	}),
	doc(
		"POST",
		"/api/tasks/chat-create",
		"Tasks",
		"Create a task from chat intake.",
		{ requestBody: "Chat task create payload." },
	),
	doc("GET", "/api/tasks/{id}", "Tasks", "Read a board task.", {
		pathParams: idParam,
	}),
	doc("PATCH", "/api/tasks/{id}", "Tasks", "Update a board task.", {
		pathParams: idParam,
		requestBody: "Task update payload.",
	}),
	doc("DELETE", "/api/tasks/{id}", "Tasks", "Delete a board task.", {
		pathParams: idParam,
	}),
	doc("GET", "/api/tasks/{id}/activity", "Tasks", "List task activity.", {
		pathParams: idParam,
	}),
];

export const entityCrudRouteDocs = [
	...crudDocs("agents", "Agents", "agent", "Agent"),
	...crudDocs("skills", "Skills", "skill", "Skill"),
];

function crudDocs(
	path: "agents" | "skills",
	group: string,
	item: string,
	label: string,
): ApiRouteDoc[] {
	return [
		doc("GET", `/api/${path}`, group, `List ${path}.`),
		doc("POST", `/api/${path}`, group, `Create a ${item}.`, {
			requestBody: `${label} create payload.`,
		}),
		doc("GET", `/api/${path}/{id}`, group, `Read a ${item}.`, {
			pathParams: idParam,
		}),
		doc("PATCH", `/api/${path}/{id}`, group, `Update a ${item}.`, {
			pathParams: idParam,
			requestBody: `${label} update payload.`,
		}),
		doc("DELETE", `/api/${path}/{id}`, group, `Delete a ${item}.`, {
			pathParams: idParam,
		}),
	];
}
