import { createServer } from "node:net";

export async function canOpenLoopbackPort(): Promise<boolean> {
	try {
		await findAvailablePort();
		return true;
	} catch {
		return false;
	}
}

export async function findAvailablePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			server.close(() => {
				if (typeof address === "object" && address?.port) {
					resolve(address.port);
					return;
				}
				reject(new Error("Unable to allocate an embedded PostgreSQL port"));
			});
		});
	});
}
