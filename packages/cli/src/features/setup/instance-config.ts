import path from "node:path";
import type { OnboardInstanceConfig } from "./instance-config.types";

const DEFAULT_INSTANCE_ID = "default";
const DEFAULT_INSTANCE_PORT = 3100;
const DEFAULT_EMBEDDED_POSTGRES_PORT = 54329;

export function renderInstanceConfig(
	cwd: string,
	updatedAt = new Date().toISOString(),
): string {
	return `${JSON.stringify(createInstanceConfig(cwd, updatedAt), null, "\t")}\n`;
}

export function createInstanceConfig(
	cwd: string,
	updatedAt: string,
): OnboardInstanceConfig {
	const instanceRoot = path.resolve(
		cwd,
		".devos",
		"instances",
		DEFAULT_INSTANCE_ID,
	);
	return {
		$meta: {
			version: 1,
			updatedAt,
			source: "onboard",
		},
		database: {
			mode: "embedded-postgres",
			embeddedPostgresDataDir: path.join(instanceRoot, "db"),
			embeddedPostgresPort: DEFAULT_EMBEDDED_POSTGRES_PORT,
			backup: {
				enabled: true,
				intervalMinutes: 60,
				retentionDays: 30,
				dir: path.join(instanceRoot, "data", "backups"),
			},
		},
		logging: {
			mode: "file",
			logDir: path.join(instanceRoot, "logs"),
		},
		server: {
			deploymentMode: "local_trusted",
			exposure: "private",
			bind: "loopback",
			host: "127.0.0.1",
			port: DEFAULT_INSTANCE_PORT,
			allowedHostnames: [],
			serveUi: true,
		},
		auth: {
			baseUrlMode: "auto",
			disableSignUp: false,
		},
		telemetry: {
			enabled: true,
		},
		storage: {
			provider: "local_disk",
			localDisk: {
				baseDir: path.join(instanceRoot, "data", "storage"),
			},
			s3: {
				bucket: "devos",
				region: "us-east-1",
				prefix: "",
				forcePathStyle: false,
			},
		},
		secrets: {
			provider: "local_encrypted",
			strictMode: false,
			localEncrypted: {
				keyFilePath: path.join(instanceRoot, "secrets", "master.key"),
			},
		},
	};
}
