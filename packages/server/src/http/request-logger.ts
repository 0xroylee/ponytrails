import type { RouteHandler } from "../app.types";
import { normalizeError } from "../logger";
import type { ServerLogger } from "../logger.types";

export function withRequestLogging(
	handler: RouteHandler,
	logger: ServerLogger,
	now = Date.now,
): RouteHandler {
	return async (request) => {
		const startedAt = now();
		const { method } = request;
		const path = new URL(request.url).pathname;

		try {
			const response = await handler(request);
			const durationMs = Math.max(0, now() - startedAt);
			const context = {
				method,
				path,
				statusCode: response.status,
				durationMs,
			};
			if (response.status >= 500) {
				logger.error(context, "HTTP request completed");
			} else {
				logger.info(context, "HTTP request completed");
			}
			return response;
		} catch (error) {
			logger.error(
				{
					method,
					path,
					durationMs: Math.max(0, now() - startedAt),
					err: normalizeError(error),
				},
				"HTTP request failed",
			);
			throw error;
		}
	};
}
