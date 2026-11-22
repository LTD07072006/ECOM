import { z } from "zod";

const databaseUrl = z.url({ protocol: /^postgres(?:ql)?$/ });

export const env = {
	get DATABASE_URL() {
		const password = process.env.ECOM_RETENTION_DB_PASSWORD;
		const fallback = password
			? `postgresql://market_entry:${encodeURIComponent(password)}@db:5432/market_entry`
			: undefined;
		const parsed = databaseUrl.safeParse(process.env.DATABASE_URL || fallback);
		if (!parsed.success)
			throw new Error("Set DATABASE_URL to a valid PostgreSQL connection URL.");
		return parsed.data;
	},
};
