import type {
	ServerDatabaseInitializationErrorInput,
	ServerDatabaseInitializationPhase,
} from "./types/database.types";

export class ServerDatabaseInitializationError extends Error {
	readonly databasePath: string;
	readonly phase: ServerDatabaseInitializationPhase;
	readonly port: number;

	constructor(input: ServerDatabaseInitializationErrorInput) {
		const causeMessage = normalizeCauseMessage(input.cause);
		super(
			`Failed to initialize server database at ${input.databasePath} on port ${input.port} during ${input.phase}: ${causeMessage}`,
			{ cause: input.cause },
		);
		this.name = "ServerDatabaseInitializationError";
		this.databasePath = input.databasePath;
		this.phase = input.phase;
		this.port = input.port;
	}
}

function normalizeCauseMessage(cause: unknown): string {
	if (cause instanceof Error) {
		return cause.message;
	}
	return cause === undefined ? "Unknown error" : String(cause);
}
