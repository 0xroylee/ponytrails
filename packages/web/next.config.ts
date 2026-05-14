import type { NextConfig } from "next";

const serverBaseUrl =
	process.env.DEVOS_SERVER_BASE_URL ?? "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	async rewrites() {
		return [
			{
				source: "/api/server/:path*",
				destination: `${serverBaseUrl}/:path*`,
			},
		];
	},
};

export default nextConfig;
