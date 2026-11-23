import { z } from "zod";

const databaseUrl = z.url({ protocol: /^postgres(?:ql)?$/ });
const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const verifiedSslModes = new Set(["require", "verify-ca", "verify-full"]);

export const env = {
	get DATABASE_URL() {
		const parsed = databaseUrl.safeParse(process.env.DATABASE_URL);
		if (!parsed.success)
			throw new Error("Set DATABASE_URL to a valid PostgreSQL connection URL.");
		if (
			process.env.NODE_ENV === "production" &&
			process.env.ECOM_DATABASE_ALLOW_INSECURE !== "1"
		) {
			const url = new URL(parsed.data);
			const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
			const sslModes = url.searchParams.getAll("sslmode");
			const hasVerifiedSsl =
				sslModes.length === 1 && verifiedSslModes.has(sslModes[0]);
			if (!loopbackHosts.has(host) && !hasVerifiedSsl) {
				throw new Error(
					"Set sslmode=require or verify-full in DATABASE_URL for production.",
				);
			}
		}
		return parsed.data;
	},
};
