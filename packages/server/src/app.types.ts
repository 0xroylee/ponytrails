import type {
	CliCommandExecutionHistoryEntry,
	CliCommandExecutionResult,
	CliCommandRequest,
} from "adhdai/features/server";
import type { ReadRepositories } from "./repositories.types";

export interface CliExecutor {
	execute(request: CliCommandRequest): Promise<CliCommandExecutionResult>;
	getHistory(): CliCommandExecutionHistoryEntry[];
}

export interface AppDeps {
	cliExecutor: CliExecutor;
	repositories: ReadRepositories;
}

export type RouteHandler = (request: Request) => Response | Promise<Response>;
