import { mkdir } from "node:fs/promises";
import net from "node:net";
import type { ResolvedEnv } from "../config";
import type {
	InstanceConfigLoadResult,
	OnboardInstanceConfig,
} from "./types/instance-config.types";
import type { OnboardCheck, OnboardCheckDeps } from "./types/onboard.types";

interface InstanceCheckOptions {
	env: ResolvedEnv;
	instanceResult: InstanceConfigLoadResult;
	mkdir?: OnboardCheckDeps["mkdir"];
	canBindPort?: OnboardCheckDeps["canBindPort"];
}

export async function collectInstanceOnboardChecks({
	env,
	instanceResult,
	mkdir: makeDir = mkdir,
	canBindPort = canBindTcpPort,
}: InstanceCheckOptions): Promise<OnboardCheck[]> {
	const checks: OnboardCheck[] = [checkJwtSecret(env)];
	if (!instanceResult.ok) {
		const message = `instance config unavailable: ${instanceResult.message}`;
		checks.push(
			fail("Storage", message),
			fail("Database", message),
			fail("Log directory", message),
			fail("Server port", message),
		);
		return checks;
	}

	const config = instanceResult.config;
	checks.push(
		await checkDirectory(
			"Storage",
			config.storage.localDisk.baseDir,
			"storage.localDisk.baseDir",
			makeDir,
		),
		await checkDatabase(config, makeDir),
		await checkDirectory(
			"Log directory",
			config.logging.logDir,
			"logging.logDir",
			makeDir,
		),
		await checkServerPort(config, canBindPort),
	);
	return checks;
}

export function canBindTcpPort(host: string, port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once("error", () => resolve(false));
		server.once("listening", () => {
			server.close(() => resolve(true));
		});
		server.listen(port, host);
	});
}

function checkJwtSecret(env: ResolvedEnv): OnboardCheck {
	return env.JWT_SECRET?.trim()
		? { name: "JWT secret", status: "pass", message: "present" }
		: { name: "JWT secret", status: "fail", message: "missing" };
}

async function checkDatabase(
	config: OnboardInstanceConfig,
	makeDir: NonNullable<OnboardCheckDeps["mkdir"]>,
): Promise<OnboardCheck> {
	const dirCheck = await ensureDirectory(
		config.database.embeddedPostgresDataDir,
		makeDir,
	);
	if (!dirCheck.ok) {
		return fail(
			"Database",
			`database data dir ${config.database.embeddedPostgresDataDir} is not accessible: ${dirCheck.message}`,
		);
	}
	const port = config.database.embeddedPostgresPort;
	if (!isValidTcpPort(port)) {
		return fail("Database", `embedded postgres port ${port} is invalid`);
	}
	return {
		name: "Database",
		status: "pass",
		message: `data dir accessible; embedded postgres port ${port} is valid`,
	};
}

async function checkDirectory(
	name: string,
	dir: string,
	label: string,
	makeDir: NonNullable<OnboardCheckDeps["mkdir"]>,
): Promise<OnboardCheck> {
	const result = await ensureDirectory(dir, makeDir);
	return result.ok
		? { name, status: "pass", message: `${label} accessible` }
		: fail(name, `${label} ${dir} is not accessible: ${result.message}`);
}

async function checkServerPort(
	config: OnboardInstanceConfig,
	canBindPort: NonNullable<OnboardCheckDeps["canBindPort"]>,
): Promise<OnboardCheck> {
	const port = config.server.port;
	if (!isValidTcpPort(port)) {
		return fail("Server port", `server port ${port} is invalid`);
	}
	const host = "127.0.0.1";
	const available = await canBindPort(host, port);
	return available
		? {
				name: "Server port",
				status: "pass",
				message: `${host}:${port} is available`,
			}
		: fail("Server port", `${host}:${port} is already in use`);
}

async function ensureDirectory(
	dir: string,
	makeDir: NonNullable<OnboardCheckDeps["mkdir"]>,
): Promise<{ ok: true } | { ok: false; message: string }> {
	try {
		await makeDir(dir, { recursive: true });
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			message: error instanceof Error ? error.message : String(error),
		};
	}
}

function isValidTcpPort(port: number): boolean {
	return Number.isInteger(port) && port > 0 && port <= 65535;
}

function fail(name: string, message: string): OnboardCheck {
	return { name, status: "fail", message };
}
