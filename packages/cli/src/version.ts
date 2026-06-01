import { readFileSync } from "node:fs";
import path from "node:path";

interface CliPackageJson {
	version: string;
}

export function getCliVersion(): string {
	const packageJson = JSON.parse(
		readFileSync(path.resolve(import.meta.dir, "../package.json"), "utf8"),
	) as CliPackageJson;
	return packageJson.version;
}
