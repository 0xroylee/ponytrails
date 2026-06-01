import { afterEach, describe, expect, it } from "bun:test";
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GET } from "../src/app/cli/route";
import { getDevosInstallScript } from "../src/lib/install-script";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
	);
});

describe("devos installer route", () => {
	it("serves the shell installer as plain text", async () => {
		const response = await GET();
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/plain");
		expect(body).toBe(getDevosInstallScript());
		expect(body.startsWith("#!/usr/bin/env sh\n")).toBe(true);
		expect(body).toContain('bun add --global "$TARGET"');
		expect(body).toContain("curl -fsSL https://bun.sh/install | bash");
		expect(body).toContain("https://devos.ing/cli/devos-0.0.2.tgz");
	});

	it("installs the hosted devos tarball with Bun by default", async () => {
		const tempDir = await makeTempDir();
		const binDir = path.join(tempDir, "bin");
		const scriptPath = path.join(tempDir, "install.sh");
		const callLogPath = path.join(tempDir, "bun-call.log");
		const curlLogPath = path.join(tempDir, "curl-call.log");
		await mkdir(binDir);
		await writeFile(scriptPath, getDevosInstallScript());
		await chmod(scriptPath, 0o755);
		await writeFakeExecutable(
			path.join(binDir, "curl"),
			[
				'printf "%s\\n" "$*" > "$CURL_CALL_LOG"',
				'while [ "$#" -gt 0 ]; do',
				'  if [ "$1" = "-o" ]; then',
				'    printf "%s\\n" "tarball" > "$2"',
				"    exit 0",
				"  fi",
				"  shift",
				"done",
				"exit 64",
			].join("\n"),
		);
		await writeFakeExecutable(
			path.join(binDir, "bun"),
			[
				'if [ "$1" = "--version" ]; then',
				'  printf "%s\\n" "1.3.8"',
				"  exit 0",
				"fi",
				'if [ "$1" = "add" ] && [ "$2" = "--global" ]; then',
				'  printf "%s\\n" "$*" > "$BUN_CALL_LOG"',
				'  printf "%s\\n" "#!/usr/bin/env sh" "echo devos" > "$FAKE_BIN/devos"',
				'  chmod +x "$FAKE_BIN/devos"',
				"  exit 0",
				"fi",
				'printf "unexpected bun args: %s\\n" "$*" >&2',
				"exit 64",
			].join("\n"),
		);

		const syntaxResult = await runShell(["sh", "-n", scriptPath], {
			PATH: `${binDir}:${process.env.PATH ?? ""}`,
		});
		expect(syntaxResult).toEqual({ code: 0, stderr: "", stdout: "" });

		const installResult = await runShell(["sh", scriptPath], {
			BUN_CALL_LOG: callLogPath,
			CURL_CALL_LOG: curlLogPath,
			FAKE_BIN: binDir,
			HOME: tempDir,
			PATH: `${binDir}:${process.env.PATH ?? ""}`,
		});

		expect(installResult.code).toBe(0);
		expect(installResult.stderr).toBe("");
		expect(await readFile(curlLogPath, "utf8")).toContain(
			"https://devos.ing/cli/devos-0.0.2.tgz",
		);
		expect(await readFile(callLogPath, "utf8")).toContain("add --global ");
		expect(await readFile(callLogPath, "utf8")).toContain("devos-cli.");
		expect(installResult.stdout).toContain("devos installed successfully");
	});
});

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "devos-installer-"));
	tempDirs.push(dir);
	return dir;
}

async function writeFakeExecutable(
	filePath: string,
	body: string,
): Promise<void> {
	await writeFile(filePath, `#!/usr/bin/env sh\nset -e\n${body}`);
	await chmod(filePath, 0o755);
}

async function runShell(
	cmd: string[],
	env: Record<string, string>,
): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn({
		cmd,
		env,
		stderr: "pipe",
		stdout: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { code, stdout, stderr };
}
