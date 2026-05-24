import type { SlackApiErrorOptions } from "./slack.types";

export class SlackApiError extends Error {
	readonly method: string;
	readonly status?: number;
	readonly error?: string;

	constructor(options: SlackApiErrorOptions) {
		const details = [
			`Slack API ${options.method} failed`,
			options.status === undefined ? undefined : `status ${options.status}`,
			options.error,
		]
			.filter(Boolean)
			.join(": ");
		super(details);
		this.name = "SlackApiError";
		this.method = options.method;
		this.status = options.status;
		this.error = options.error;
	}
}
