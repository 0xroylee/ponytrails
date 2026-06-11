import type { RouteHandler } from "../../types/app.types";
import type { ApiRouteDoc } from "./api-docs.types";

export interface RouteRequestContext {
	pathname: string;
}

export type RouteRegistryResponse = Response | null | Promise<Response | null>;

export type RouteRegistryHandler = (
	request: Request,
	context: RouteRequestContext,
) => RouteRegistryResponse;

export interface RouteRegistryEntry {
	docs?: ApiRouteDoc[];
	name: string;
	handle: RouteRegistryHandler;
}

export type RouteFallbackHandler = RouteHandler;
