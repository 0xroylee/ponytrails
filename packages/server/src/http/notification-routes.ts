import { parseNotificationServerRequest } from "../notifications/notification-server-request";
import { parseNotificationRequest } from "../notifications/notifications-request";
import type { AppDeps } from "../types/app.types";
import {
	badRequestResponse,
	jsonError,
	jsonSuccess,
	methodNotAllowedResponse,
	serverErrorResponse,
} from "./response";

export async function handleNotificationRoute(
	request: Request,
	deps: AppDeps,
	pathname: string,
): Promise<Response | null> {
	if (pathname === "/api/notifications") {
		return handleNotificationServerRoute(request, deps);
	}
	if (pathname === "/api/notifications/email") {
		return handleNotificationEmailRoute(request, deps);
	}
	return null;
}

async function handleNotificationServerRoute(
	request: Request,
	deps: AppDeps,
): Promise<Response> {
	if (request.method !== "POST") {
		return methodNotAllowedResponse();
	}
	const parsed = await parseNotificationServerRequest(request);
	if (parsed.status === "error") {
		return badRequestResponse(parsed.error);
	}
	if (!deps.notificationSender) {
		return serverErrorResponse("Notification sender not configured");
	}
	await deps.notificationSender.sendNotification(parsed.request);
	return jsonSuccess({ status: "accepted" }, { status: 202 });
}

async function handleNotificationEmailRoute(
	request: Request,
	deps: AppDeps,
): Promise<Response> {
	if (request.method !== "POST") {
		return methodNotAllowedResponse();
	}
	const parsed = await parseNotificationRequest(request);
	if (parsed.status === "error") {
		return badRequestResponse(parsed.error);
	}
	if (!deps.notificationService) {
		return serverErrorResponse("Notification service not configured");
	}
	const result = await deps.notificationService.send(parsed.request);
	if (result.status === "config_error") {
		return jsonError(result.error, { status: 503 });
	}
	if (result.status === "send_error") {
		return jsonError(result.error, { status: 502 });
	}
	return jsonSuccess({ status: "sent" }, { status: 200 });
}
