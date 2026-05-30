const sessionRoutePrefix = "/session/";

export function isChatSurfacePathname(pathname: string): boolean {
	return (
		pathname === "/chat" ||
		pathname.startsWith("/chat/") ||
		pathname.startsWith(sessionRoutePrefix)
	);
}

export function activeChatSessionIdFromPathname(pathname: string): string {
	if (!pathname.startsWith(sessionRoutePrefix)) {
		return "";
	}
	const encodedSessionId = pathname
		.slice(sessionRoutePrefix.length)
		.split("/")[0];
	if (!encodedSessionId) {
		return "";
	}
	try {
		return decodeURIComponent(encodedSessionId);
	} catch {
		return encodedSessionId;
	}
}
