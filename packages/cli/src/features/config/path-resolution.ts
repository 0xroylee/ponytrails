import path from "node:path";

export function normalizeOptionalPath(
	input: unknown,
	baseDir: string,
): string | undefined {
	if (typeof input !== "string") {
		return undefined;
	}
	const trimmed = input.trim();
	if (!trimmed) {
		return undefined;
	}
	return path.isAbsolute(trimmed)
		? trimmed
		: path.resolve(baseDir || process.cwd(), trimmed);
}
