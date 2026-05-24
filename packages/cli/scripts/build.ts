import { rm } from "node:fs/promises";
import path from "node:path";

interface BuildCliPackageOptions {
	entrypoint?: string;
	outdir?: string;
}

const packageRoot = path.resolve(import.meta.dir, "..");

export async function buildCliPackage(
	options: BuildCliPackageOptions = {},
): Promise<void> {
	const outdir = options.outdir ?? path.join(packageRoot, "dist");
	await rm(outdir, { recursive: true, force: true });
	const result = await Bun.build({
		entrypoints: [options.entrypoint ?? path.join(packageRoot, "src/index.ts")],
		naming: { entry: "[name].[ext]" },
		root: packageRoot,
		target: "bun",
		outdir,
	});
	if (!result.success) {
		throw new Error(formatBuildErrors(result.logs));
	}
}

function formatBuildErrors(logs: Array<{ message: string }>): string {
	const message = logs
		.map((log) => log.message)
		.join("\n")
		.trim();
	return message || "CLI build failed";
}

if (import.meta.main) {
	await buildCliPackage(parseBuildCliPackageOptions(process.argv.slice(2)));
}

function parseBuildCliPackageOptions(args: string[]): BuildCliPackageOptions {
	const options: BuildCliPackageOptions = {};
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg !== "--outdir") {
			throw new Error(`Unknown build option: ${arg}`);
		}
		const outdir = args[index + 1];
		if (!outdir) {
			throw new Error("Missing value for --outdir");
		}
		options.outdir = outdir;
		index += 1;
	}
	return options;
}
