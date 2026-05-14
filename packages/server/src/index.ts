import path from "node:path";
import { CliCommandExecutor } from "adhdai/features/server/cli-command-executor";
import { createHandleRequest } from "./app";
import { createBoardRepository } from "./board";
import { initializeServerDatabase } from "./db";
import {
	logger,
	normalizeError,
	setupServerProcessErrorHandlers,
} from "./logger";
import { createNotificationSender } from "./notifications/notification-sender";
import {
	createNotificationConfigFromEnv,
	createNotificationService,
} from "./notifications/notifications-service";
import { createResendClient } from "./notifications/resend-client";
import { createReadRepositories } from "./repositories";

const DEFAULT_SERVER_DB_PATH = path.join(
	process.cwd(),
	".piv-loop",
	"config",
	"server-db",
);
const DEFAULT_SERVER_PORT = 3001;

export async function startServer(
	port = resolveServerPort(process.env),
): Promise<Bun.Server<undefined>> {
	const databasePath =
		process.env.PIV_SERVER_DATABASE_PATH ?? DEFAULT_SERVER_DB_PATH;
	const cwd = process.cwd();
	logger.info({ port, databasePath, cwd }, "Starting server");
	const serverDatabase = await initializeServerDatabase(databasePath);
	const server = Bun.serve({
		port,
		fetch: createHandleRequest({
			db: serverDatabase.db,
			cliExecutor: new CliCommandExecutor({
				cwd,
				command: "bun",
				baseArgs: ["run", "./packages/cli/src/index.ts"],
			}),
			boardRepository: createBoardRepository(serverDatabase.db),
			notificationSender: createNotificationSender({
				resendApiKey: process.env.RESEND_API_KEY,
			}),
			notificationService: createNotificationService({
				config: createNotificationConfigFromEnv(process.env),
				resendClient: createResendClient(process.env.RESEND_API_KEY ?? ""),
			}),
			repositories: createReadRepositories(serverDatabase),
			logger,
		}),
	});
	logger.info({ port: server.port, databasePath, cwd }, "Server started");
	return server;
}

if (import.meta.main) {
	setupServerProcessErrorHandlers();
	startServer().catch((error) => {
		logger.fatal({ err: normalizeError(error) }, "Server startup failed");
		process.exit(1);
	});
}

function resolveServerPort(env: NodeJS.ProcessEnv): number {
	const rawPort = env.PIV_SERVER_PORT ?? env.PORT;
	if (!rawPort) {
		return DEFAULT_SERVER_PORT;
	}
	const port = Number(rawPort);
	if (!Number.isInteger(port) || port <= 0) {
		throw new Error("Server port must be a positive integer");
	}
	return port;
}
