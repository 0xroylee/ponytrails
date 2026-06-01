import path from "node:path";
import type { OnboardInstanceConfig } from "../packages/cli/src/features/onboard/types/instance-config.types";

export function buildSandboxInstanceConfig(input: {
	dbPort: string;
	root: string;
	serverPort: string;
}): OnboardInstanceConfig {
	return {
		$meta: {
			source: "onboard",
			updatedAt: new Date().toISOString(),
			version: 1,
		},
		auth: { baseUrlMode: "auto", disableSignUp: true },
		database: {
			backup: {
				dir: path.join(input.root, "backups"),
				enabled: false,
				intervalMinutes: 60,
				retentionDays: 7,
			},
			embeddedPostgresDataDir: path.join(input.root, "server-db"),
			embeddedPostgresPort: Number(input.dbPort),
			mode: "embedded-postgres",
		},
		logging: { logDir: path.join(input.root, "logs"), mode: "file" },
		plugins: { installed: [] },
		secrets: {
			localEncrypted: {
				keyFilePath: path.join(input.root, "secrets", "key.json"),
			},
			provider: "local_encrypted",
			strictMode: false,
		},
		server: {
			allowedHostnames: ["127.0.0.1", "localhost"],
			bind: "loopback",
			deploymentMode: "local_trusted",
			exposure: "private",
			host: "127.0.0.1",
			port: Number(input.serverPort),
			serveUi: true,
		},
		storage: {
			localDisk: { baseDir: path.join(input.root, "storage") },
			provider: "local_disk",
			s3: {
				bucket: "",
				forcePathStyle: false,
				prefix: "",
				region: "",
			},
		},
		telemetry: { enabled: false },
		workspace: {
			id: "production-daemon-sandbox",
			name: "Production Daemon Sandbox",
		},
	};
}
