import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ReleaseRole } from "./operations";

export type OperatorIdentity = {
	role: ReleaseRole;
	actor: string;
};

export const OPERATOR_SESSION_COOKIE = "ecom_operator_session";
export const OPERATOR_SESSION_TTL_SECONDS = 2 * 60 * 60;

const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/;

function digest(value: string) {
	return createHash("sha256").update(value).digest();
}

type ConfiguredOperators = {
	entries: Array<{ id: string; role: ReleaseRole; token: string }>;
	keyMaterial: string;
};

function loadConfiguredOperators(): ConfiguredOperators | null {
	if (process.env.ECOM_OPERATORS) {
		try {
			const entries: unknown = JSON.parse(process.env.ECOM_OPERATORS);
			if (
				!Array.isArray(entries) ||
				entries.length === 0 ||
				entries.length > 100
			) {
				return null;
			}
			const valid = entries.every(
				(entry) =>
					entry &&
					typeof entry.id === "string" &&
					/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/.test(entry.id) &&
					(entry.role === "reviewer" || entry.role === "steward") &&
					typeof entry.token === "string" &&
					tokenPattern.test(entry.token),
			);
			if (
				!valid ||
				new Set(entries.map((entry) => entry.id.toLowerCase())).size !==
					entries.length ||
				new Set(entries.map((entry) => entry.token)).size !== entries.length
			) {
				return null;
			}
			return {
				entries: entries as Array<{
					id: string;
					role: ReleaseRole;
					token: string;
				}>,
				keyMaterial: process.env.ECOM_OPERATORS,
			};
		} catch {
			return null;
		}
	}

	if (
		process.env.ECOM_REQUIRE_NAMED_OPERATORS === "1" ||
		process.env.NODE_ENV === "production"
	) {
		return null;
	}

	const reviewer = process.env.RELEASE_REVIEWER_TOKEN;
	const steward = process.env.RELEASE_STEWARD_TOKEN;
	if (
		!reviewer ||
		!steward ||
		!tokenPattern.test(reviewer) ||
		!tokenPattern.test(steward) ||
		reviewer === steward
	) {
		return null;
	}

	return {
		entries: [
			{ id: "reviewer", role: "reviewer", token: reviewer },
			{ id: "steward", role: "steward", token: steward },
		],
		keyMaterial: `${reviewer}:${steward}`,
	};
}

function sessionSigningKey(config: ConfiguredOperators): Buffer {
	const explicit = process.env.ECOM_SESSION_SECRET?.trim();
	const material =
		explicit && explicit.length >= 32
			? `${explicit}:${config.keyMaterial}`
			: config.keyMaterial;
	return createHash("sha256")
		.update(`ecom-operator-session-v1:${material}`)
		.digest();
}

export function verifyOperatorToken(token: string): OperatorIdentity | null {
	if (!tokenPattern.test(token)) return null;
	const config = loadConfiguredOperators();
	if (!config) return null;
	const actual = digest(token);
	const match = config.entries.find((entry) =>
		timingSafeEqual(actual, digest(entry.token)),
	);
	return match ? { role: match.role, actor: match.id } : null;
}

export function createOperatorSessionCookie(
	identity: OperatorIdentity,
	nowMs = Date.now(),
): { value: string; expiresAt: string; header: string } | null {
	const config = loadConfiguredOperators();
	if (!config) return null;
	const expSeconds = Math.floor(nowMs / 1000) + OPERATOR_SESSION_TTL_SECONDS;
	const payload = Buffer.from(
		JSON.stringify({
			actor: identity.actor,
			role: identity.role,
			exp: expSeconds,
		}),
		"utf8",
	).toString("base64url");
	const sig = createHmac("sha256", sessionSigningKey(config))
		.update(payload)
		.digest("base64url");
	const value = `${payload}.${sig}`;
	const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
	const header = `${OPERATOR_SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${OPERATOR_SESSION_TTL_SECONDS}${secure}`;
	return {
		value,
		expiresAt: new Date(expSeconds * 1000).toISOString(),
		header,
	};
}

export function clearOperatorSessionCookie(): string {
	const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
	return `${OPERATOR_SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

function readCookieValue(
	cookieHeader: string | null,
	name: string,
): string | null {
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(";")) {
		const index = part.indexOf("=");
		if (index <= 0) continue;
		if (part.slice(0, index).trim() === name) {
			return part.slice(index + 1).trim();
		}
	}
	return null;
}

export function verifyOperatorSessionCookie(
	cookieHeader: string | null,
	nowMs = Date.now(),
): OperatorIdentity | null {
	const raw = readCookieValue(cookieHeader, OPERATOR_SESSION_COOKIE);
	if (!raw || raw.length > 1024) return null;
	const dot = raw.indexOf(".");
	if (dot <= 0 || dot !== raw.lastIndexOf(".")) return null;
	const payload = raw.slice(0, dot);
	const sig = raw.slice(dot + 1);
	if (!payload || !sig) return null;

	const config = loadConfiguredOperators();
	if (!config) return null;

	const expected = createHmac("sha256", sessionSigningKey(config))
		.update(payload)
		.digest();
	const actual = Buffer.from(sig, "base64url");
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
		return null;
	}

	try {
		const decoded = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		) as { actor?: unknown; role?: unknown; exp?: unknown };
		if (
			typeof decoded.actor !== "string" ||
			(decoded.role !== "steward" && decoded.role !== "reviewer") ||
			typeof decoded.exp !== "number" ||
			decoded.exp <= Math.floor(nowMs / 1000)
		) {
			return null;
		}
		// Ensure the operator is still active in the current configuration.
		const active = config.entries.some(
			(entry) => entry.id === decoded.actor && entry.role === decoded.role,
		);
		return active ? { actor: decoded.actor, role: decoded.role } : null;
	} catch {
		return null;
	}
}

export function releaseIdentity(request: Request): OperatorIdentity | null {
	const authHeader = request.headers.get("authorization");
	if (authHeader !== null) {
		const token = authHeader.match(/^Bearer ([A-Za-z0-9_-]{43,128})$/)?.[1];
		return token ? verifyOperatorToken(token) : null;
	}
	return verifyOperatorSessionCookie(request.headers.get("cookie"));
}

export function releaseRole(request: Request): ReleaseRole | null {
	return releaseIdentity(request)?.role ?? null;
}
