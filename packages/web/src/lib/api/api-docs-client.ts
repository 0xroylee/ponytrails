import {
	assertObjectRecord,
	readString,
	readStringArray,
} from "./response-utils";
import type {
	ApiDocsApiMethods,
	ApiDocsResponse,
	ApiRouteDoc,
	ApiRouteMethod,
} from "./types/api-docs.types";
import type { HealthRequestOptions } from "./types/client.types";

const ENDPOINT = "/api/docs/routes";
const METHODS = new Set<ApiRouteMethod>(["DELETE", "GET", "PATCH", "POST"]);

type RequestWithBase = (
	path: string,
	method: "GET" | "POST" | "PATCH" | "DELETE",
	options?: HealthRequestOptions,
	body?: unknown,
) => Promise<unknown>;

export function createApiDocsApiMethods(
	requestWithBase: RequestWithBase,
): ApiDocsApiMethods {
	return {
		async listApiDocs(options) {
			const payload = await requestWithBase(ENDPOINT, "GET", options);
			return parseApiDocsResponse(payload);
		},
	};
}

export function parseApiDocsResponse(payload: unknown): ApiDocsResponse {
	const row = assertObjectRecord(payload, ENDPOINT);
	const routes = row.routes;
	if (!Array.isArray(routes)) {
		throw new Error(`Invalid ${ENDPOINT} response field 'routes'`);
	}
	return { routes: routes.map(parseApiRouteDoc) };
}

function parseApiRouteDoc(payload: unknown): ApiRouteDoc {
	const row = assertObjectRecord(payload, ENDPOINT);
	return {
		group: readString(row, "group", ENDPOINT),
		method: readMethod(row),
		path: readString(row, "path", ENDPOINT),
		response: readString(row, "response", ENDPOINT),
		summary: readString(row, "summary", ENDPOINT),
		...readOptionalString(row, "name"),
		...readOptionalStringArray(row, "pathParams"),
		...readOptionalStringArray(row, "queryParams"),
		...readOptionalString(row, "requestBody"),
	};
}

function readMethod(row: Record<string, unknown>): ApiRouteMethod {
	const method = readString(row, "method", ENDPOINT);
	if (METHODS.has(method as ApiRouteMethod)) {
		return method as ApiRouteMethod;
	}
	throw new Error(`Invalid ${ENDPOINT} response field 'method'`);
}

function readOptionalString(
	row: Record<string, unknown>,
	key: "name" | "requestBody",
): Partial<Pick<ApiRouteDoc, "name" | "requestBody">> {
	if (row[key] === undefined) {
		return {};
	}
	return { [key]: readString(row, key, ENDPOINT) };
}

function readOptionalStringArray(
	row: Record<string, unknown>,
	key: "pathParams" | "queryParams",
): Partial<Pick<ApiRouteDoc, "pathParams" | "queryParams">> {
	if (row[key] === undefined) {
		return {};
	}
	return { [key]: readStringArray(row, key, ENDPOINT) };
}
