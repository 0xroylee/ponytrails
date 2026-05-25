import { initializeServerDatabase } from "devos-db";
import { loadServerStartupConfig } from "devos/features/config";
import { createHandleRequest } from "./app";
import { createBoardRepository } from "./board";
import { createExpressApp, listenExpressApp } from "./express-server";
import { ensureLocalProjectBoard } from "./local-workspace";
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
import { createRealtimeEventBus } from "./realtime";
import { createReadRepositories } from "./repositories";
import {
	createServerRuntime,
	installServerShutdownHandlers,
} from "./server-runtime";
import {
	resolveServerDatabasePath,
	resolveServerDatabasePort,
	resolveServerWorkspacePath,
} from "./startup-paths";
import type { ServerInstance } from "./types/express-server.types";
import type { ServerRuntime } from "./types/server-runtime.types";
import { WORKFLOW_DATA_WS_PATH } from "./workflow-data";
import { createWorkflowCommandBroker } from "./workflow-data/workflow-command-broker";
import { attachWorkflowDataSocket } from "./workflow-data/workflow-data-socket";
import { attachRealtimeEventsSocket } from "./ws/realtime-events";

const DEFAULT_SERVER_PORT = 3001;

export async function startServer(
	port = resolveServerPort(process.env),
): Promise<ServerInstance> {
	const runtime = await startServerRuntime(port);
	return runtime.server;
}

export async function startServerRuntime(
	port = resolveServerPort(process.env),
): Promise<ServerRuntime> {
	const startupStartedAt = Date.now();
	const cwd = process.cwd();
	const workspacePath = resolveServerWorkspacePath(process.env);
	const config = await loadServerStartupConfig(workspacePath);
	const workspace = config.workspace;
	const databasePath = resolveServerDatabasePath(
		process.env,
		workspacePath,
		config,
	);
	const databasePort = resolveServerDatabasePort(config);
	logger.info(
		{ port, databasePath, databasePort, cwd, workspacePath, workspace },
		"Starting server",
	);
	const startupContext = {
		port,
		databasePath,
		databasePort,
		cwd,
		workspacePath,
		workspace,
	};
	logServerStartupPhase("database_initialize:start", startupStartedAt, {
		codexSandbox: process.env.CODEX_SANDBOX,
		codexSandboxNetworkDisabled: process.env.CODEX_SANDBOX_NETWORK_DISABLED,
		databasePath,
		databasePort,
		requestedDatabaseEngine: process.env.DEVOS_DB_ENGINE,
	});
	const serverDatabase = await initializeServerDatabase(databasePath, {
		logDatabaseProcess: process.env.PIV_POSTGRES_DEBUG === "1",
		onInitializationPhase: (event) => {
			logServerStartupPhase(
				`database:${event.engine}:${event.phase}:${event.status}`,
				startupStartedAt,
				{
					databasePath: event.databasePath,
					databasePort: event.port,
					errorMessage: event.errorMessage,
				},
			);
		},
		port: databasePort,
	});
	logServerStartupPhase("database_initialize:done", startupStartedAt, {
		databasePath,
		databasePort,
	});
	logServerStartupPhase("local_project_board:start", startupStartedAt, {
		workspace,
	});
	await ensureLocalProjectBoard(serverDatabase.db, workspace);
	logServerStartupPhase("local_project_board:done", startupStartedAt, {
		workspace,
	});
	logServerStartupPhase("app_create:start", startupStartedAt, startupContext);
	const commandBroker = createWorkflowCommandBroker();
	const realtimeEvents = createRealtimeEventBus();
	const app = createExpressApp(
		createHandleRequest({
			db: serverDatabase.db,
			cliExecutor: commandBroker,
			boardRepository: createBoardRepository(serverDatabase.db),
			notificationSender: createNotificationSender({
				resendApiKey: process.env.RESEND_API_KEY,
			}),
			notificationService: createNotificationService({
				config: createNotificationConfigFromEnv(process.env),
				resendClient: createResendClient(process.env.RESEND_API_KEY ?? ""),
			}),
			realtimeEvents,
			repositories: createReadRepositories(serverDatabase),
			workspace,
			workspacePath,
		}),
		{ logger },
	);
	logServerStartupPhase("app_create:done", startupStartedAt, startupContext);
	logServerStartupPhase("http_listen:start", startupStartedAt, { port });
	const server = await listenExpressApp(app, port);
	const address = server.address();
	const listeningPort = typeof address === "object" ? address?.port : port;
	logServerStartupPhase("http_listen:done", startupStartedAt, {
		address,
		port: listeningPort ?? port,
	});
	logServerStartupPhase("websocket_attach:start", startupStartedAt, {
		realtimePath: "/api/events",
		workflowDataPath: WORKFLOW_DATA_WS_PATH,
	});
	const realtimeEventsSocket = attachRealtimeEventsSocket({
		server,
		path: "/api/events",
		eventBus: realtimeEvents,
	});
	const workflowDataSocket = attachWorkflowDataSocket({
		server,
		path: WORKFLOW_DATA_WS_PATH,
		db: serverDatabase.db,
		commandBroker,
		realtimeEvents,
	});
	logServerStartupPhase("websocket_attach:done", startupStartedAt, {
		realtimePath: "/api/events",
		workflowDataPath: WORKFLOW_DATA_WS_PATH,
	});
	logServerStartupPhase("runtime_create:start", startupStartedAt);
	const runtime = createServerRuntime({
		server,
		serverDatabase,
		realtimeEventsSocket,
		workflowDataSocket,
		logger,
	});
	logServerStartupPhase("runtime_create:done", startupStartedAt);
	logger.info(
		{
			port: listeningPort ?? port,
			databasePath,
			databasePort,
			cwd,
			workspace,
			workspacePath,
		},
		"Server started",
	);
	return runtime;
}

if (import.meta.main) {
	setupServerProcessErrorHandlers();
	startServerRuntime()
		.then((runtime) => {
			installServerShutdownHandlers(runtime, { logger });
			logger.info("Server shutdown handlers installed");
		})
		.catch((error) => {
			logger.fatal({ err: normalizeError(error) }, "Server startup failed");
			process.exit(1);
		});
}

function logServerStartupPhase(
	phase: string,
	startedAt: number,
	context: Record<string, unknown> = {},
): void {
	logger.info(
		{
			phase,
			elapsedMs: Date.now() - startedAt,
			...context,
		},
		"Server startup phase",
	);
}

function resolveServerPort(env: NodeJS.ProcessEnv): number {
	const rawPort = DEFAULT_SERVER_PORT;
	// if (!rawPort) {
	// 	return DEFAULT_SERVER_PORT;
	// }
	const port = Number(rawPort);
	if (!Number.isInteger(port) || port <= 0) {
		throw new Error("Server port must be a positive integer");
	}
	return port;
}
