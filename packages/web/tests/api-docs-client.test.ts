import { describe, expect, it } from "bun:test";
import {
	createApiDocsApiMethods,
	parseApiDocsResponse,
} from "../src/lib/api/api-docs-client";

describe("API docs client", () => {
	it("fetches generated API docs", async () => {
		const requestWithBase = async (
			path: string,
			method: "GET" | "POST" | "PATCH" | "DELETE",
		): Promise<unknown> => {
			expect(path).toBe("/api/docs/routes");
			expect(method).toBe("GET");
			return apiDocsPayload();
		};
		const client = createApiDocsApiMethods(requestWithBase);

		await expect(client.listApiDocs()).resolves.toEqual(apiDocsPayload());
	});

	it("validates generated API docs payloads", () => {
		expect(() =>
			parseApiDocsResponse({
				routes: [{ ...apiDocsPayload().routes[0], method: "PUT" }],
			}),
		).toThrow("Invalid /api/docs/routes response field 'method'");
	});
});

function apiDocsPayload() {
	return {
		routes: [
			{
				group: "Docs",
				method: "GET",
				path: "/api/docs/routes",
				response: "JSON response.",
				summary: "List generated server API docs.",
				queryParams: ["projectId"],
			},
		],
	};
}
