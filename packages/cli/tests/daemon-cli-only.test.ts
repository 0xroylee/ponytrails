import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import {
	type CliCommandDaemon,
	type DaemonSignalTarget,
	runCliCommandDaemonOnly,
} from "../src/features/daemon";

describe("runCliCommandDaemonOnly", () => {
	it("starts the command daemon and stops it on process signal", async () => {
		const signalTarget = new FakeSignalTarget();
		const messages: string[] = [];
		const harness = createCommandDaemonHarness();
		const done = runCliCommandDaemonOnly({
			cwd: "/repo",
			env: { DEVOS_CLI_DAEMON_PORT: "4103" },
			signalTarget,
			startCommandDaemon: harness.startCommandDaemon,
			write: (message) => messages.push(message),
		});

		expect(harness.calls).toEqual([
			{ cwd: "/repo", env: { DEVOS_CLI_DAEMON_PORT: "4103" } },
		]);
		expect(messages).toEqual([
			"CLI daemon websocket listening on ws://127.0.0.1:4103\n",
		]);

		signalTarget.emitSignal("SIGTERM");

		await expect(done).resolves.toBe(0);
		expect(harness.stopped).toBe(true);
	});
});

class FakeSignalTarget implements DaemonSignalTarget {
	private readonly emitter = new EventEmitter();

	on(signal: NodeJS.Signals, listener: () => void): void {
		this.emitter.on(signal, listener);
	}

	off(signal: NodeJS.Signals, listener: () => void): void {
		this.emitter.off(signal, listener);
	}

	emitSignal(signal: NodeJS.Signals): void {
		this.emitter.emit(signal);
	}
}

function createCommandDaemonHarness(): {
	calls: Array<{ cwd: string; env?: NodeJS.ProcessEnv }>;
	startCommandDaemon: (options: {
		cwd: string;
		env?: NodeJS.ProcessEnv;
	}) => CliCommandDaemon;
	stopped: boolean;
} {
	const harness = {
		calls: [] as Array<{ cwd: string; env?: NodeJS.ProcessEnv }>,
		stopped: false,
		startCommandDaemon: (options: {
			cwd: string;
			env?: NodeJS.ProcessEnv;
		}) => {
			harness.calls.push(options);
			return {
				port: 4103,
				stop: async () => {
					harness.stopped = true;
				},
			};
		},
	};
	return harness;
}
