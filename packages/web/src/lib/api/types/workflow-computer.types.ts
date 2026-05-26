export interface WorkflowComputerRecord {
	id: string;
	name: string;
	hostname: string;
	platform: string;
	arch: string;
	cwd: string;
	startedAt: string;
	workerId: string;
	status: "online" | "offline";
	connectedAt: string;
	lastSeenAt: string;
	disconnectedAt?: string;
	processId?: number;
	user?: string;
}

export interface WorkflowComputerApiMethods {
	listWorkflowComputers(options?: { signal?: AbortSignal }): Promise<
		WorkflowComputerRecord[]
	>;
}
