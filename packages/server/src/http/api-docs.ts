import { jsonSuccess, methodNotAllowedResponse } from "./response";
import type { ApiDocsResponse, ApiRouteDoc } from "./types/api-docs.types";
import type { RouteRegistryEntry } from "./types/route-registry.types";

type DocInput = Omit<ApiRouteDoc, "response"> & { response?: string };

export const apiDocsRouteDocs = [
	doc("GET", "/api/docs/routes", "Docs", "List generated server API docs."),
];

export function collectApiRouteDocs(
	routes: RouteRegistryEntry[],
): ApiRouteDoc[] {
	const docsByRoute = new Map<string, ApiRouteDoc>();
	for (const route of routes) {
		for (const routeDoc of route.docs ?? []) {
			const routeKey = `${routeDoc.method} ${routeDoc.path}`;
			if (!docsByRoute.has(routeKey)) {
				docsByRoute.set(routeKey, routeDoc);
			}
		}
	}
	return [...docsByRoute.values()].sort((left, right) => {
		const pathOrder = left.path.localeCompare(right.path);
		return pathOrder || left.method.localeCompare(right.method);
	});
}

export function handleApiDocsRoute(
	request: Request,
	pathname: string,
	readRoutes: () => RouteRegistryEntry[],
): Response | null {
	if (pathname !== "/api/docs/routes") {
		return null;
	}
	if (request.method !== "GET") {
		return methodNotAllowedResponse();
	}
	const response: ApiDocsResponse = {
		routes: collectApiRouteDocs(readRoutes()),
	};
	return jsonSuccess(response);
}

export function doc(
	method: ApiRouteDoc["method"],
	path: string,
	group: string,
	summary: string,
	options: Omit<DocInput, "group" | "method" | "path" | "summary"> = {},
): ApiRouteDoc {
	return {
		method,
		path,
		group,
		summary,
		response: options.response ?? "JSON response.",
		...(options.name ? { name: options.name } : {}),
		...(options.pathParams ? { pathParams: options.pathParams } : {}),
		...(options.queryParams ? { queryParams: options.queryParams } : {}),
		...(options.requestBody ? { requestBody: options.requestBody } : {}),
	};
}
