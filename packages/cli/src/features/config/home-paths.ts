import os from "node:os";
import path from "node:path";
import { SQLITE_ENV_DB_FILE } from "./constants";

export const INSTANCE_CONFIG_FILE = "instance.config.json";
export const DEFAULT_INSTANCE_ID = "default";

export function devosHomeDir(): string {
	return path.join(process.env.HOME?.trim() || os.homedir(), ".devos");
}

export function devosHomeConfigDir(): string {
	return path.join(devosHomeDir(), "config");
}

export function devosHomeInstanceRoot(
	instanceId = DEFAULT_INSTANCE_ID,
): string {
	return path.join(devosHomeDir(), "instances", instanceId);
}

export function instanceConfigPath(): string {
	return path.join(devosHomeConfigDir(), INSTANCE_CONFIG_FILE);
}

export function sqliteEnvDbPath(): string {
	return path.join(devosHomeConfigDir(), SQLITE_ENV_DB_FILE);
}
