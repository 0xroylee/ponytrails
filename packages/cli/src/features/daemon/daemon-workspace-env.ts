export function resolveDaemonWorkspaceEnv(
	env: NodeJS.ProcessEnv,
	cwd?: string,
): NodeJS.ProcessEnv {
	if (!cwd || env.PIV_WORKSPACE_PATH) {
		return env;
	}
	return { ...env, PIV_WORKSPACE_PATH: cwd };
}
