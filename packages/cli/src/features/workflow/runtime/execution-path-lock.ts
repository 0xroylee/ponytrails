const executionPathLockTails = new Map<string, Promise<void>>();

export async function withExecutionPathLock<T>(
	executionPath: string,
	run: () => Promise<T>,
): Promise<T> {
	const currentTail = executionPathLockTails.get(executionPath);
	const previousTail = currentTail
		? currentTail.catch(() => undefined)
		: undefined;

	let release!: () => void;
	const nextTail = new Promise<void>((resolve) => {
		release = resolve;
	});
	const queuedTail = previousTail
		? previousTail.then(() => nextTail)
		: nextTail;
	executionPathLockTails.set(executionPath, queuedTail);

	if (previousTail) {
		await previousTail;
	}

	try {
		return await run();
	} finally {
		release();
		if (executionPathLockTails.get(executionPath) === queuedTail) {
			executionPathLockTails.delete(executionPath);
		}
	}
}
