import type { NotificationServerRequest } from "adhdai/features/server";
import type { AppDeps, RouteHandler } from "./app.types";
import { handleCliRoute } from "./http/cli-routes";
import { handleProjectsRoute } from "./http/projects-routes";
import { withRequestLogging } from "./http/request-logger";
import { handleTasksRoute } from "./http/tasks-routes";
import { parseNotificationRequest } from "./notifications/notifications-request";
import { handleEntityCrudRequest, matchCrudRoute } from "./routes/entity-crud";

const WORKSPACE_PROJECTS_ROUTE = /^\/api\/workspaces\/([^/]+)\/projects\/?$/;
const WORKSPACE_PROJECT_BOARD_ROUTE =
	/^\/api\/workspaces\/([^/]+)\/projects\/([^/]+)\/board\/?$/;

export function createHandleRequest(deps: AppDeps): RouteHandler {
	const handler: RouteHandler = async (request) => {
		const { pathname } = new URL(request.url);

		const cliResponse = await handleCliRoute(
			request,
			deps.cliExecutor,
			pathname,
		);
		if (cliResponse) {
			return cliResponse;
		}

		if (deps.db) {
			const projectResponse = await handleProjectsRoute(
				request,
				deps.db,
				pathname,
			);
			if (projectResponse) {
				return projectResponse;
			}
		}

		if (deps.db) {
			const taskResponse = await handleTasksRoute(request, deps.db, pathname);
			if (taskResponse) {
				return taskResponse;
			}
		}

		const crudRoute = matchCrudRoute(pathname);
		if (crudRoute) {
			if (!deps.db) {
				return Response.json(
					{ error: "Server database not configured" },
					{ status: 500 },
				);
			}
			const result = await handleEntityCrudRequest(
				request,
				{ db: deps.db },
				crudRoute,
			);
			if (result?.body === undefined) {
				return new Response(null, { status: result.status });
			}
			return Response.json(result.body, { status: result.status });
		}
		const projectMatch = pathname.match(WORKSPACE_PROJECTS_ROUTE);
		if (projectMatch) {
			if (request.method !== "GET") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			if (!deps.boardRepository) {
				return Response.json(
					{ error: "Board repository not configured" },
					{ status: 500 },
				);
			}
			const workspaceId = decodeURIComponent(projectMatch[1] ?? "");
			if (workspaceId.length === 0) {
				return Response.json({ error: "Not Found" }, { status: 404 });
			}
			const projects =
				await deps.boardRepository.listWorkspaceProjects(workspaceId);
			return Response.json({ workspaceId, projects });
		}

		const boardMatch = pathname.match(WORKSPACE_PROJECT_BOARD_ROUTE);
		if (boardMatch) {
			if (request.method !== "GET") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			if (!deps.boardRepository) {
				return Response.json(
					{ error: "Board repository not configured" },
					{ status: 500 },
				);
			}
			const workspaceId = decodeURIComponent(boardMatch[1] ?? "");
			const projectId = decodeURIComponent(boardMatch[2] ?? "");
			if (workspaceId.length === 0 || projectId.length === 0) {
				return Response.json({ error: "Not Found" }, { status: 404 });
			}
			const board = await deps.boardRepository.getWorkspaceProjectBoard(
				workspaceId,
				projectId,
			);
			if (!board) {
				return Response.json({ error: "Not Found" }, { status: 404 });
			}
			return Response.json(board);
		}

		if (pathname === "/api/notifications") {
			if (request.method !== "POST") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			const parsed = await parseNotificationServerRequest(request);
			if (parsed.status === "error") {
				return Response.json({ error: parsed.error }, { status: 400 });
			}
			if (!deps.notificationSender) {
				return Response.json(
					{ error: "Notification sender not configured" },
					{ status: 500 },
				);
			}
			await deps.notificationSender.sendNotification(parsed.request);
			return Response.json({ status: "accepted" }, { status: 202 });
		}

		if (pathname === "/api/notifications/email") {
			if (request.method !== "POST") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			const parsed = await parseNotificationRequest(request);
			if (parsed.status === "error") {
				return Response.json({ error: parsed.error }, { status: 400 });
			}
			if (!deps.notificationService) {
				return Response.json(
					{ error: "Notification service not configured" },
					{ status: 500 },
				);
			}
			const result = await deps.notificationService.send(parsed.request);
			if (result.status === "config_error") {
				return Response.json({ error: result.error }, { status: 503 });
			}
			if (result.status === "send_error") {
				return Response.json({ error: result.error }, { status: 502 });
			}
			return Response.json({ status: "sent" }, { status: 200 });
		}

		return new Response("Not Found", { status: 404 });
	};
	return deps.logger ? withRequestLogging(handler, deps.logger) : handler;
}

export const handleRequest: RouteHandler = async (request) => {
	const { pathname } = new URL(request.url);

	if (pathname === "/health" && request.method === "GET") {
		return Response.json({ status: "ok" });
	}

	return new Response("Not Found", { status: 404 });
};

async function parseNotificationServerRequest(
	request: Request,
): Promise<
	| { status: "ok"; request: NotificationServerRequest }
	| { status: "error"; error: string }
> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return { status: "error", error: "Malformed JSON body" };
	}
	if (!isRecord(body)) {
		return {
			status: "error",
			error: "Malformed notification request: expected object body",
		};
	}
	if (body.type !== "task-outcome" && body.type !== "human-review-required") {
		return {
			status: "error",
			error:
				"Malformed notification request: type must be 'task-outcome' or 'human-review-required'",
		};
	}
	if (!isNotificationEmailPayload(body.payload)) {
		return {
			status: "error",
			error:
				"Malformed notification request: payload must include from, to, subject, and text",
		};
	}
	if (body.type === "task-outcome") {
		return {
			status: "ok",
			request: body as unknown as NotificationServerRequest,
		};
	}
	if (typeof body.complexityScore !== "number") {
		return {
			status: "error",
			error: "Malformed notification request: complexityScore must be a number",
		};
	}
	if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
		return {
			status: "error",
			error:
				"Malformed notification request: reason must be a non-empty string",
		};
	}
	return {
		status: "ok",
		request: body as unknown as NotificationServerRequest,
	};
}

function isNotificationEmailPayload(
	value: unknown,
): value is NotificationServerRequest["payload"] {
	return (
		isRecord(value) &&
		typeof value.from === "string" &&
		Array.isArray(value.to) &&
		value.to.every((recipient) => typeof recipient === "string") &&
		typeof value.subject === "string" &&
		typeof value.text === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
