import type { OnboardInstanceConfig } from "../../packages/cli/src/features/onboard/types/instance-config.types";

export interface ProdDaemonSandboxOptions {
	cwd?: string;
	dbPort?: string;
	env?: NodeJS.ProcessEnv;
	serverPort?: string;
	skipBuild?: boolean;
	webPort?: string;
}

export interface ProdDaemonSandbox {
	dbPort: string;
	env: NodeJS.ProcessEnv;
	home: string;
	instanceConfig: OnboardInstanceConfig;
	instanceConfigPath: string;
	root: string;
	serverBaseUrl: string;
	serverPort: string;
	webPort: string;
	webUrl: string;
	workflowWsUrl: string;
}

export interface ProdDaemonSandboxCommand {
	args: string[];
	command: string;
	cwd: string;
	env: NodeJS.ProcessEnv;
	stdio: "inherit";
}

export interface RunProdDaemonSandboxOptions extends ProdDaemonSandboxOptions {
	args?: string[];
	mkdir?: (targetPath: string) => Promise<void>;
	runCommand?: (command: ProdDaemonSandboxCommand) => Promise<number>;
	write?: (message: string) => void;
	writeFile?: (targetPath: string, content: string) => Promise<void>;
}
