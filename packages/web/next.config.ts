import type { NextConfig } from "next";

const monitoringApiBaseUrl = process.env.MONITORING_API_BASE_URL?.trim() ?? "";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	async rewrites() {
		if (!monitoringApiBaseUrl) {
			return [];
		}

		return [
			{
				source: "/api/token-usage",
				destination: `${monitoringApiBaseUrl}/api/token-usage`,
			},
			{
				source: "/api/jobs",
				destination: `${monitoringApiBaseUrl}/api/jobs`,
			},
			{
				source: "/api/agents",
				destination: `${monitoringApiBaseUrl}/api/agents`,
			},
			{
				source: "/api/skills",
				destination: `${monitoringApiBaseUrl}/api/skills`,
			},
		];
	},
};

export default nextConfig;
