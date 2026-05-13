import type { AppDeps, RouteHandler } from "./app.types";
import { handleCliRoute } from "./http/cli-routes";
import { handleProjectsRoute } from "./http/projects-routes";
import { handleTasksRoute } from "./http/tasks-routes";

export function createHandleRequest(deps: AppDeps): RouteHandler {
	return async (request) => {
		const { pathname } = new URL(request.url);

		if (pathname === "/health" && request.method === "GET") {
			return Response.json({ status: "ok" });
		}

		const cliResponse = await handleCliRoute(
			request,
			deps.cliExecutor,
			pathname,
		);
		if (cliResponse) {
			return cliResponse;
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

		return new Response("Not Found", { status: 404 });
	};
}

export const handleRequest: RouteHandler = (request) => {
	const { pathname } = new URL(request.url);

	if (pathname === "/health" && request.method === "GET") {
		return Response.json({ status: "ok" });
	}

	return new Response("Not Found", { status: 404 });
};
