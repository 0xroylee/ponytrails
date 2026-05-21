import type {
	DevosRootConfig,
	ProjectRuntimeConfig,
} from "../../features/types";
import { normalizeOptionalPath } from "./path-resolution";
import type { ServerRuntimeConfig } from "./server.types";

export function resolveRootServerConfig(
	configCwd: string,
	base: ProjectRuntimeConfig,
	root: DevosRootConfig,
): ServerRuntimeConfig {
	return {
		database: {
			databasePath: resolveServerDatabasePathForRoot(configCwd, base, root),
		},
	};
}

export function resolveServerDatabasePathForRoot(
	configCwd: string,
	base: ProjectRuntimeConfig,
	root: DevosRootConfig,
): string {
	return (
		normalizeOptionalPath(
			root.server?.database?.databasePath ?? base.server.database.databasePath,
			configCwd,
		) ?? base.server.database.databasePath
	);
}
