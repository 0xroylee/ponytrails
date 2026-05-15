import { describe, expect, it } from "bun:test";
import { normalizeExpressErrorForResponse } from "../src/express-server";

describe("Express request validation", () => {
	it("returns field-specific errors for empty chat task project ids", () => {
		const normalized = normalizeExpressErrorForResponse({
			status: 400,
			message: "request/body/projectId must NOT have fewer than 1 characters",
			errors: [
				{
					path: "/body/projectId",
					message: "must NOT have fewer than 1 characters",
					errorCode: "minLength.openapi.validation",
				},
			],
		});

		expect(normalized).toEqual({
			status: 400,
			error: "projectId must be a non-empty string",
		});
	});
});
