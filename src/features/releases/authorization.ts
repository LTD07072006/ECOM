import { createHash, timingSafeEqual } from "node:crypto";
import type { ReleaseRole } from "./operations";

export function releaseIdentity(
	request: Request,
): { role: ReleaseRole; actor: string } | null {
	const token = request.headers
		.get("authorization")
		?.match(/^Bearer ([A-Za-z0-9_-]{43,128})$/)?.[1];
	const digest = (value: string) => createHash("sha256").update(value).digest();
	if (!token) return null;
	if (process.env.ECOM_OPERATORS) {
		try {
			const entries: unknown = JSON.parse(process.env.ECOM_OPERATORS);
			if (
				!Array.isArray(entries) ||
				entries.length === 0 ||
				entries.length > 100
			)
				return null;
			const valid = entries.every(
				(entry) =>
					entry &&
					typeof entry.id === "string" &&
					/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/.test(entry.id) &&
					(entry.role === "reviewer" || entry.role === "steward") &&
					typeof entry.token === "string" &&
					/^[A-Za-z0-9_-]{43,128}$/.test(entry.token),
			);
			if (
				!valid ||
				new Set(entries.map((entry) => entry.id.toLowerCase())).size !==
					entries.length ||
				new Set(entries.map((entry) => entry.token)).size !== entries.length
			)
				return null;
			const actual = digest(token);
			const match = entries.find((entry) =>
				timingSafeEqual(actual, digest(entry.token)),
			);
			return match ? { role: match.role, actor: match.id } : null;
		} catch {
			return null;
		}
	}
	if (
		process.env.ECOM_REQUIRE_NAMED_OPERATORS === "1" ||
		process.env.NODE_ENV === "production"
	)
		return null;
	const reviewer = process.env.RELEASE_REVIEWER_TOKEN;
	const steward = process.env.RELEASE_STEWARD_TOKEN;
	const valid = /^[A-Za-z0-9_-]{43,128}$/;
	if (
		!reviewer ||
		!steward ||
		!valid.test(reviewer) ||
		!valid.test(steward) ||
		reviewer === steward ||
		!token
	)
		return null;
	const actual = digest(token);
	const isReviewer = timingSafeEqual(actual, digest(reviewer));
	const isSteward = timingSafeEqual(actual, digest(steward));
	return isReviewer
		? { role: "reviewer", actor: "reviewer" }
		: isSteward
			? { role: "steward", actor: "steward" }
			: null;
}

export function releaseRole(request: Request): ReleaseRole | null {
	return releaseIdentity(request)?.role ?? null;
}
