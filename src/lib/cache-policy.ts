export type CachePolicy = "published-context" | "live-route" | "error";

export function cacheHeaders(policy: CachePolicy): Record<string, string> {
	if (policy === "published-context")
		return {
			"Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
		};
	return { "Cache-Control": "private, no-store" };
}
