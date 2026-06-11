import type { HealthRequestOptions } from "./health.types";

export type ApiRouteMethod = "DELETE" | "GET" | "PATCH" | "POST";

export interface ApiRouteDoc {
	group: string;
	method: ApiRouteMethod;
	path: string;
	response: string;
	summary: string;
	name?: string;
	pathParams?: string[];
	queryParams?: string[];
	requestBody?: string;
}

export interface ApiDocsResponse {
	routes: ApiRouteDoc[];
}

export interface ApiDocsApiMethods {
	listApiDocs(options?: HealthRequestOptions): Promise<ApiDocsResponse>;
}
