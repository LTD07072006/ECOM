import { expect, test } from "bun:test";
import { env as appEnv } from "../../src/lib/env";

function withEnv(
	overrides: Record<string, string | undefined>,
	fn: () => void,
) {
	const processEnv: Record<string, string | undefined> = process.env;
	const saved: Record<string, string | undefined> = {};
	for (const key of Object.keys(overrides)) {
		saved[key] = processEnv[key];
		const value = overrides[key];
		if (value === undefined) delete processEnv[key];
		else processEnv[key] = value;
	}
	try {
		fn();
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete processEnv[key];
			else processEnv[key] = value;
		}
	}
}

test("DATABASE_URL enforces TLS for non-loopback hosts in production and rejects legacy password fallback", () => {
	withEnv(
		{
			NODE_ENV: "production",
			DATABASE_URL:
				"postgresql://runtime:pass@db.example.com:5432/market_entry",
			ECOM_DATABASE_ALLOW_INSECURE: undefined,
		},
		() => {
			expect(() => appEnv.DATABASE_URL).toThrow(
				"Set sslmode=require or verify-full in DATABASE_URL for production.",
			);
		},
	);

	withEnv(
		{
			NODE_ENV: "production",
			DATABASE_URL:
				"postgresql://runtime:pass@db.example.com:5432/market_entry?sslmode=disable",
			ECOM_DATABASE_ALLOW_INSECURE: undefined,
		},
		() => {
			expect(() => appEnv.DATABASE_URL).toThrow(
				"Set sslmode=require or verify-full in DATABASE_URL for production.",
			);
		},
	);

	for (const mode of ["require", "verify-ca", "verify-full"]) {
		const url = `postgresql://runtime:pass@db.example.com:5432/market_entry?sslmode=${mode}`;
		withEnv(
			{
				NODE_ENV: "production",
				DATABASE_URL: url,
				ECOM_DATABASE_ALLOW_INSECURE: undefined,
			},
			() => {
				expect(appEnv.DATABASE_URL).toBe(url);
			},
		);
	}

	for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
		const url = `postgresql://runtime:pass@${host}:5432/market_entry`;
		withEnv(
			{
				NODE_ENV: "production",
				DATABASE_URL: url,
				ECOM_DATABASE_ALLOW_INSECURE: undefined,
			},
			() => {
				expect(appEnv.DATABASE_URL).toBe(url);
			},
		);
	}

	withEnv(
		{
			NODE_ENV: "production",
			DATABASE_URL: "postgresql://runtime:pass@db:5432/market_entry",
			ECOM_DATABASE_ALLOW_INSECURE: "1",
		},
		() => {
			expect(appEnv.DATABASE_URL).toBe(
				"postgresql://runtime:pass@db:5432/market_entry",
			);
		},
	);

	withEnv(
		{
			NODE_ENV: "development",
			DATABASE_URL: undefined,
			ECOM_RETENTION_DB_PASSWORD: "legacy-password",
		},
		() => {
			expect(() => appEnv.DATABASE_URL).toThrow(
				"Set DATABASE_URL to a valid PostgreSQL connection URL.",
			);
		},
	);
});
