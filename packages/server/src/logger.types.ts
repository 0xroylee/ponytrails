export type ServerLogContext = Record<string, unknown>;

export interface ServerLogger {
	info(context: ServerLogContext, message: string): void;
	error(context: ServerLogContext, message: string): void;
	fatal(context: ServerLogContext, message: string): void;
}
