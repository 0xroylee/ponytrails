import type { AppDeps, RouteHandler } from "./app.types";
import { handleEntityCrudRequest, matchCrudRoute } from "./routes/entity-crud";

const UNSAFE_RAW_COMMAND_FIELDS = ["command", "cmd", "args", "argv", "shell"];
const WORKSPACE_PROJECTS_ROUTE = /^\/api\/workspaces\/([^/]+)\/projects\/?$/;
const WORKSPACE_PROJECT_BOARD_ROUTE =
	/^\/api\/workspaces\/([^/]+)\/projects\/([^/]+)\/board\/?$/;

export function createHandleRequest(deps: AppDeps): RouteHandler {
	const boardReadModels = deps.boardReadModels;

	return async (request) => {
		const { pathname } = new URL(request.url);
		const workspaceProjectsMatch = pathname.match(WORKSPACE_PROJECTS_PATTERN);
		const projectBoardMatch = pathname.match(PROJECT_BOARD_PATTERN);

		const cliResponse = await handleCliRoute(
			request,
			deps.cliExecutor,
			pathname,
		);
		if (cliResponse) {
			return cliResponse;
		}
		if (workspaceProjectsMatch) {
			if (request.method !== "GET") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			if (!boardReadModels) {
				return Response.json(
					{ error: "Board read models not configured" },
					{ status: 500 },
				);
			}
			const workspaceId = decodeURIComponent(workspaceProjectsMatch[1] ?? "");
			return Response.json(
				await boardReadModels.listWorkspaceProjects(workspaceId),
			);
		}
		if (projectBoardMatch) {
			if (request.method !== "GET") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			if (!boardReadModels) {
				return Response.json(
					{ error: "Board read models not configured" },
					{ status: 500 },
				);
			}
			const workspaceId = decodeURIComponent(projectBoardMatch[1] ?? "");
			const projectId = decodeURIComponent(projectBoardMatch[2] ?? "");
			return Response.json(
				await boardReadModels.getProjectBoard(workspaceId, projectId),
			);
		}

		const projectResponse = await handleProjectsRoute(
			request,
			deps.db,
			pathname,
		);
		if (projectResponse) {
			return projectResponse;
		}

		const taskResponse = await handleTasksRoute(request, deps.db, pathname);
		if (taskResponse) {
			return taskResponse;
		}

		const crudRoute = matchCrudRoute(pathname);
		if (crudRoute) {
			const result = await handleEntityCrudRequest(request, deps, crudRoute);
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

		return new Response("Not Found", { status: 404 });
	};
}

export const handleRequest: RouteHandler = async (request) => {
	const { pathname } = new URL(request.url);

	if (pathname === "/health" && request.method === "GET") {
		return Response.json({ status: "ok" });
	}

	return new Response("Not Found", { status: 404 });
};

async function parseDispatchRequest(
	request: Request,
): Promise<
	| { status: "ok"; request: Record<string, unknown> & { action: string } }
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
			error: "Malformed dispatch request: expected object body",
		};
	}
	if (typeof body.action !== "string" || body.action.trim().length === 0) {
		return {
			status: "error",
			error: "Malformed dispatch request: action must be a non-empty string",
		};
	}
	for (const field of UNSAFE_RAW_COMMAND_FIELDS) {
		if (field in body) {
			return {
				status: "error",
				error: `Unsafe dispatch request: raw command field '${field}' is not allowed`,
			};
		}
		return jsonSuccess({ status: "ok" });
	}

	return notFoundResponse();
};
