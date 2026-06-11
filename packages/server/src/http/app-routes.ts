import type { ServerDatabase } from "devos-db";
import { defaultLocalWorkspace } from "../local-workspace";
import { READ_ONLY_SERVER_PATHS, handleServerRequest } from "../routes";
import { handleEntityCrudRequest, matchCrudRoute } from "../routes/entity-crud";
import type { AppDeps } from "../types/app.types";
import { apiDocsRouteDocs, handleApiDocsRoute } from "./api-docs";
import { handleChatRoute } from "./chat-routes";
import { handleCliRoute } from "./cli-routes";
import { handleGitHubRepositoriesRoute } from "./github-repositories-routes";
import { handleGitHubRoute } from "./github-routes";
import { handleInboxMessagesRoute } from "./inbox-routes";
import { handleNotificationRoute } from "./notification-routes";
import { handlePollingStatusRoute } from "./polling-status-routes";
import { handleProjectsRoute } from "./projects-routes";
import { jsonSuccess, serverErrorResponse } from "./response";
import { apiRouteDocs } from "./server-api-route-docs";
import { handleSettingsRoute } from "./settings-routes";
import { handleTasksRoute } from "./tasks-routes";
import type { RouteRegistryEntry } from "./types/route-registry.types";
import { handleWorkspaceBoardRoute } from "./workspace-board-routes";
import { handleWorkspaceEnvironmentRoute } from "./workspace-environment-routes";

type DbRouteHandler = (
	db: ServerDatabase["db"],
	request: Request,
	pathname: string,
) => Promise<Response | null>;

export function createAppRoutes(deps: AppDeps): RouteRegistryEntry[] {
	const workspace = deps.workspace ?? defaultLocalWorkspace();
	const workspacePath = deps.workspacePath ?? process.cwd();
	const routes: RouteRegistryEntry[] = [
		...createHealthRoutes(),
		route(
			"workspace-current",
			(request, { pathname }) => {
				if (pathname !== "/api/workspace/current" || request.method !== "GET") {
					return null;
				}
				return jsonSuccess({
					workspaceId: workspace.id,
					name: workspace.name,
				});
			},
			apiRouteDocs.workspaceCurrent,
		),
		route(
			"api-docs",
			(request, { pathname }) =>
				handleApiDocsRoute(request, pathname, () => routes),
			apiDocsRouteDocs,
		),
		route(
			"github",
			(request, { pathname }) =>
				handleGitHubRoute(request, pathname, deps.githubRepositorySearchFetch),
			apiRouteDocs.github,
		),
		route(
			"workspace-environment",
			async (request, { pathname }) =>
				(await handleWorkspaceEnvironmentRoute(
					request,
					deps.db,
					pathname,
					workspacePath,
					workspace,
				)) ?? null,
			apiRouteDocs.workspaceEnvironment,
		),
		route(
			"cli",
			(request, { pathname }) =>
				handleCliRoute(request, deps.cliExecutor, pathname),
			apiRouteDocs.cli,
		),
		dbRoute(
			"chat",
			deps,
			(db, request, pathname) =>
				handleChatRoute(
					request,
					db,
					pathname,
					workspacePath,
					workspace,
					deps.cliExecutor,
					deps.realtimeEvents,
				),
			apiRouteDocs.chat,
		),
		dbRoute(
			"polling-status",
			deps,
			(db, request, pathname) =>
				handlePollingStatusRoute(request, db, pathname),
			apiRouteDocs.pollingStatus,
		),
		dbRoute(
			"projects",
			deps,
			(db, request, pathname) =>
				handleProjectsRoute(request, db, deps.realtimeEvents, pathname),
			apiRouteDocs.projects,
		),
		dbRoute(
			"tasks",
			deps,
			(db, request, pathname) =>
				handleTasksRoute(
					request,
					db,
					deps.cliExecutor,
					deps.realtimeEvents,
					pathname,
				),
			apiRouteDocs.tasks,
		),
		dbRoute(
			"inbox",
			deps,
			(db, request, pathname) =>
				handleInboxMessagesRoute(request, db, deps.realtimeEvents, pathname),
			apiRouteDocs.inbox,
		),
		route(
			"workspace-board",
			(request, { pathname }) =>
				handleWorkspaceBoardRoute(request, deps.boardRepository, pathname),
			apiRouteDocs.workspaceBoard,
		),
		route(
			"settings",
			(request, { pathname }) =>
				handleSettingsRoute(request, pathname, workspacePath),
			apiRouteDocs.settings,
		),
		route(
			"github-repositories",
			(request, { pathname }) =>
				handleGitHubRepositoriesRoute(request, pathname, workspacePath),
			apiRouteDocs.githubRepositories,
		),
		route(
			"entity-crud",
			(request, { pathname }) =>
				handleEntityCrudRoute(request, deps, pathname, workspacePath),
			apiRouteDocs.entityCrud,
		),
		route(
			"notifications",
			(request, { pathname }) =>
				handleNotificationRoute(request, deps, pathname),
			apiRouteDocs.notifications,
		),
		route(
			"read-only-server",
			(request, { pathname }) =>
				handleReadOnlyServerRoute(request, deps, pathname),
			apiRouteDocs.readOnly,
		),
	];
	return routes;
}

export function createHealthRoutes(): RouteRegistryEntry[] {
	return [
		route(
			"health",
			(request, { pathname }) =>
				pathname === "/health" && request.method === "GET"
					? jsonSuccess({ status: "ok" })
					: null,
			apiRouteDocs.health,
		),
	];
}

function route(
	name: string,
	handle: RouteRegistryEntry["handle"],
	docs?: RouteRegistryEntry["docs"],
): RouteRegistryEntry {
	return { name, handle, ...(docs ? { docs } : {}) };
}

function dbRoute(
	name: string,
	deps: AppDeps,
	handle: DbRouteHandler,
	docs?: RouteRegistryEntry["docs"],
): RouteRegistryEntry {
	return route(
		name,
		(request, { pathname }) =>
			deps.db ? handle(deps.db, request, pathname) : null,
		docs,
	);
}

async function handleEntityCrudRoute(
	request: Request,
	deps: AppDeps,
	pathname: string,
	workspacePath: string,
): Promise<Response | null> {
	const crudRoute = matchCrudRoute(pathname);
	if (!crudRoute) {
		return null;
	}
	if (!deps.db) {
		return serverErrorResponse("Server database not configured");
	}
	const result = await handleEntityCrudRequest(
		request,
		{
			db: deps.db,
			isRuntimeReachable: deps.cliExecutor.isRuntimeReachable,
			workspacePath,
		},
		crudRoute,
	);
	return result.body === undefined
		? new Response(null, { status: result.status })
		: jsonSuccess(result.body, { status: result.status });
}

function handleReadOnlyServerRoute(
	request: Request,
	deps: AppDeps,
	pathname: string,
): Response | Promise<Response> | null {
	if (!(READ_ONLY_SERVER_PATHS as readonly string[]).includes(pathname)) {
		return null;
	}
	if (!deps.repositories) {
		return serverErrorResponse("Read repositories not configured");
	}
	return handleServerRequest(request, { repositories: deps.repositories });
}
