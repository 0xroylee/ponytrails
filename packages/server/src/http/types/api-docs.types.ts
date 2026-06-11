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
