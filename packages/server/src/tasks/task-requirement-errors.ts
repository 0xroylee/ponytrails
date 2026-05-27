const NO_CLI_WORKER_ERROR = "No CLI worker connected to /api/workflow";
const NO_CLI_WORKER_ACTIONABLE_MESSAGE =
	"No CLI worker is connected. Start or reconnect a CLI worker, then try again.";

export class NoCliWorkerAvailableError extends Error {
	readonly statusCode = 503;

	constructor(message = NO_CLI_WORKER_ACTIONABLE_MESSAGE) {
		super(message);
		this.name = "NoCliWorkerAvailableError";
	}
}

export function isNoCliWorkerAvailableError(error: unknown): boolean {
	return error instanceof NoCliWorkerAvailableError;
}

export function toTaskRequirementIntakeError(error: string | undefined): Error {
	const normalizedError = error?.trim();
	if (normalizedError === NO_CLI_WORKER_ERROR) {
		return new NoCliWorkerAvailableError();
	}
	return new Error(normalizedError || "Task requirement intake failed");
}
