export interface AgentAdapterErrorOptions {
	backend: string;
	message: string;
	command: string;
	args: string[];
	cwd?: string;
	code?: number;
	stdout?: string;
	stderr?: string;
	traceId?: string;
}

export class AgentAdapterError extends Error {
	readonly backend: string;
	readonly command: string;
	readonly args: string[];
	readonly cwd?: string;
	readonly code?: number;
	readonly stdout?: string;
	readonly stderr?: string;
	readonly traceId?: string;

	constructor(options: AgentAdapterErrorOptions) {
		super(options.message);
		this.name = "AgentAdapterError";
		this.backend = options.backend;
		this.command = options.command;
		this.args = options.args;
		this.cwd = options.cwd;
		this.code = options.code;
		this.stdout = options.stdout;
		this.stderr = options.stderr;
		this.traceId = options.traceId;
	}
}
