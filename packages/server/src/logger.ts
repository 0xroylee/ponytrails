import pinoHttp from "pino-http";
import pretty from "pino-pretty";
import type { ServerLogger, ServerLoggerOptions } from "./logger.types";

const DEFAULT_LOG_LEVEL = "info";
const LOG_LEVEL_VALUES = [
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
	"silent",
] as const;

type ServerLogLevel = (typeof LOG_LEVEL_VALUES)[number];

const LOG_LEVELS = new Set<ServerLogLevel>(LOG_LEVEL_VALUES);

export const logger: ServerLogger = createServerLogger();

export function createServerLogger(
	options: ServerLoggerOptions = {},
): ServerLogger {
	const env = options.env ?? { PIV_LOG_LEVEL: process.env.PIV_LOG_LEVEL };
	const stream = pretty({
		colorize: options.color,
		destination: options.destination ?? 2,
		ignore: "pid,hostname",
		singleLine: true,
		sync: options.sync ?? true,
	});

	return pinoHttp(
		{
			autoLogging: false,
			base: options.context ?? {},
			level: resolveLogLevel(env.PIV_LOG_LEVEL),
			timestamp: isoTimestamp,
		},
		stream,
	).logger;
}

export function setupServerProcessErrorHandlers(): void {
	process.on("unhandledRejection", (reason) => {
		logger.error(
			{ err: normalizeError(reason) },
			"Unhandled promise rejection",
		);
	});

	process.on("uncaughtException", (error) => {
		logger.fatal({ err: normalizeError(error) }, "Uncaught exception");
		process.exit(1);
	});
}

export function normalizeError(input: unknown): Record<string, unknown> {
	if (input instanceof Error) {
		const normalized: Record<string, unknown> = {
			name: input.name,
			message: input.message,
			stack: input.stack,
		};
		const databaseError = normalizeServerDatabaseInitializationFields(input);
		if (databaseError) {
			normalized.databasePath = databaseError.databasePath;
			normalized.phase = databaseError.phase;
			normalized.databasePort = databaseError.port;
		}
		if (input.cause) {
			normalized.cause = normalizeError(input.cause);
		}
		return normalized;
	}
	return { message: String(input) };
}

function normalizeServerDatabaseInitializationFields(
	error: Error,
): { databasePath: string; phase: string; port: number } | undefined {
	const maybeDatabaseError = error as Error & {
		databasePath?: unknown;
		phase?: unknown;
		port?: unknown;
	};
	if (
		typeof maybeDatabaseError.databasePath === "string" &&
		typeof maybeDatabaseError.phase === "string" &&
		typeof maybeDatabaseError.port === "number"
	) {
		return {
			databasePath: maybeDatabaseError.databasePath,
			phase: maybeDatabaseError.phase,
			port: maybeDatabaseError.port,
		};
	}
	return undefined;
}

function resolveLogLevel(value: string | undefined): ServerLogLevel {
	if (isServerLogLevel(value)) {
		return value;
	}
	return DEFAULT_LOG_LEVEL;
}

function isServerLogLevel(value: string | undefined): value is ServerLogLevel {
	return value !== undefined && LOG_LEVELS.has(value as ServerLogLevel);
}

function isoTimestamp(): string {
	return `,"time":"${new Date().toISOString()}"`;
}
