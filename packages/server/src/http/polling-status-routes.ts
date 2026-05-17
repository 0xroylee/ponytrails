import type { ServerDatabase } from "../db";
import { listPollingStatus } from "../polling-status";
import { jsonSuccess, methodNotAllowedResponse } from "./response";

export async function handlePollingStatusRoute(
	request: Request,
	db: ServerDatabase["db"],
	pathname: string,
): Promise<Response | null> {
	if (pathname !== "/api/polling/status") {
		return null;
	}
	if (request.method !== "GET") {
		return methodNotAllowedResponse();
	}
	return jsonSuccess(await listPollingStatus(db));
}
