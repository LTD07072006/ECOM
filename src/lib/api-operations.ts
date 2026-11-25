import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { databasePool } from "../db/pool";
import { releaseRole } from "../features/releases/authorization";
import { error } from "./http";
import { getTelemetryStore, type TelemetryOutcome } from "./observability";
import { persistObservabilityEvent } from "../features/observability/repository";

const limits = {
	search: 180,
	profile: 180,
	compare: 60,
	export: 30,
	internal: 120,
	inquiries: 10,
	inquiry_status: 20,
	boundaries: 60,
	layers: 60,
	road_routes: 10,
	site_visit_routes: 30,
} as const;
const ceilings = {
	search: 1800,
	profile: 1800,
	compare: 600,
	export: 300,
	internal: 1200,
	inquiries: 100,
	inquiry_status: 200,
	boundaries: 600,
	layers: 600,
	road_routes: 100,
	site_visit_routes: 300,
} as const;
type QuotaRoute = keyof typeof limits;
type Route = QuotaRoute | "health";
const minute = 60_000;
const localQuotas = new Map<string, number>();
const quotaRoutes = new Set<string>(Object.keys(limits));
const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/;
let localWindow = -1;
let nextQuotaCleanup = 0;
let warnedIngressUnconfigured = false;

export const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function boundedQuery(request: Request, ...allowed: string[]) {
	const url = new URL(request.url);
	if (url.search.length > 4096) return null;
	const seen = new Set<string>();
	for (const [key] of url.searchParams) {
		if (!allowed.includes(key) || seen.has(key)) return null;
		seen.add(key);
	}
	return url.searchParams;
}

function canonicalClientIp(address: string) {
	if (isIP(address) === 4) return address;
	if (address.includes("%") || isIP(address) !== 6) return null;
	const host = new URL(`http://[${address}]/`).hostname.slice(1, -1);
	const [head, tail] = host.split("::");
	const left = head ? head.split(":") : [];
	const right = tail ? tail.split(":") : [];
	const parts =
		tail === undefined
			? left
			: [
					...left,
					...Array<string>(8 - left.length - right.length).fill("0"),
					...right,
				];
	if (parts.slice(0, 6).join(":") === "0:0:0:0:0:ffff") {
		return parts
			.slice(6)
			.flatMap((part) => {
				const value = Number.parseInt(part, 16);
				return [value >> 8, value & 255];
			})
			.join(".");
	}
	return `${parts.slice(0, 4).join(":")}::/64`;
}

function trustedClient(request: Request, scope: string) {
	const secret = process.env.ECOM_TRUSTED_PROXY_TOKEN;
	if (!secret) {
		if (
			process.env.NODE_ENV === "production" &&
			process.env.ECOM_ALLOW_DIRECT_INGRESS !== "1"
		) {
			if (!warnedIngressUnconfigured) {
				warnedIngressUnconfigured = true;
				console.warn(JSON.stringify({ event: "ingress_unconfigured" }));
			}
			return null;
		}
		return "direct";
	}
	const proof = request.headers.get("x-ecom-ingress-token") ?? "";
	if (
		!tokenPattern.test(secret) ||
		!tokenPattern.test(proof) ||
		secret.length !== proof.length ||
		!timingSafeEqual(Buffer.from(secret), Buffer.from(proof))
	)
		return null;
	const address = canonicalClientIp(
		request.headers.get("x-ecom-client-ip") ?? "",
	);
	return (
		address &&
		createHmac("sha256", secret)
			.update(`quota:${scope}:${address}`)
			.digest("hex")
	);
}

async function takeQuota(route: QuotaRoute, request: Request) {
	const limit = limits[route];
	const ceiling = ceilings[route];
	const scope =
		route === "internal"
			? `internal:${releaseRole(request) ?? "anonymous"}`
			: route;
	const client = trustedClient(request, scope);
	if (client === null) return { untrusted: true, wait: 0 };
	if (process.env.NODE_ENV === "production") {
		const sql = databasePool();
		const now = Date.now();
		if (now >= nextQuotaCleanup) {
			nextQuotaCleanup = now + minute;
			await sql`delete from market_entry.api_client_quotas
        where (route, client_key) in (
          select route, client_key from market_entry.api_client_quotas
          where window_start < statement_timestamp() - interval '1 hour'
          order by window_start limit 5000
        ) and window_start < statement_timestamp() - interval '1 hour'`;
		}
		const [bucket] = await sql<{ limited: boolean; retry_after: number }[]>`
      with client_quota as (
        insert into market_entry.api_client_quotas (route, client_key, window_start, requests)
        select ${scope}, ${client}, date_trunc('minute', statement_timestamp()), 1
        where not exists (
          select 1 from market_entry.api_quotas
          where route = ${scope} and window_start = date_trunc('minute', statement_timestamp()) and requests >= ${ceiling}
        )
        on conflict (route, client_key) do update set
          requests = case when api_client_quotas.window_start < excluded.window_start then 1
            else least(api_client_quotas.requests + 1, ${limit + 1}) end,
          window_start = greatest(api_client_quotas.window_start, excluded.window_start)
        returning requests
      ), global_quota as (
        insert into market_entry.api_quotas (route, window_start, requests)
        select ${scope}, date_trunc('minute', statement_timestamp()), 1 from client_quota where requests <= ${limit}
        on conflict (route) do update set
          requests = case when api_quotas.window_start < excluded.window_start then 1
            else least(api_quotas.requests + 1, ${ceiling + 1}) end,
          window_start = greatest(api_quotas.window_start, excluded.window_start)
        returning requests
      )
      select coalesce((select requests > ${ceiling} from global_quota), true) as limited,
        greatest(1, ceil(extract(epoch from (date_trunc('minute', statement_timestamp()) +
          interval '1 minute' - clock_timestamp()))))::int as retry_after
    `;
		return { untrusted: false, wait: bucket.limited ? bucket.retry_after : 0 };
	}

	const now = Date.now();
	const window = Math.floor(now / minute);
	if (localWindow !== window) {
		localQuotas.clear();
		localWindow = window;
	}
	const key = `${scope}:${client}`;
	const count = (localQuotas.get(key) ?? 0) + 1;
	const total = (localQuotas.get(scope) ?? 0) + 1;
	const limited = count > limit || total > ceiling;
	if (!limited) {
		localQuotas.set(key, count);
		localQuotas.set(scope, total);
	}
	return {
		untrusted: false,
		wait: limited ? Math.ceil((minute - (now % minute)) / 1000) : 0,
	};
}

export function errorCode(cause: unknown): string {
	const code = (cause as { code?: unknown } | null)?.code;
	if (typeof code === "string" && code) return code;
	return cause instanceof Error && cause.name ? cause.name : "UnknownError";
}

export async function observeApi(
	route: Route,
	request: Request,
	handler: () => Promise<Response>,
	privateResponse = false,
) {
	const started = performance.now();
	let response: Response;
	try {
		const quota = quotaRoutes.has(route)
			? await takeQuota(route as QuotaRoute, request)
			: null;
		if (quota?.untrusted) {
			response = error("The service is temporarily unavailable.", 503);
		} else if (quota?.wait) {
			response = error("Too many requests. Try again shortly.", 429);
			response.headers.set("Retry-After", String(quota.wait));
		} else {
			response = await handler();
		}
	} catch (cause) {
		if (process.env.NODE_ENV !== "test") {
			console.error(
				JSON.stringify({
					event: "api_error",
					route,
					code: errorCode(cause),
				}),
			);
		}
		response = error("The service is temporarily unavailable.", 503);
	}
	if (privateResponse || route === "internal") {
		response.headers.set("Cache-Control", "private, no-store");
		response.headers.set("Vary", "Authorization, Cookie");
	} else if (!response.headers.has("Cache-Control")) {
		response.headers.set("Cache-Control", "no-store");
	}
	response.headers.set("X-Content-Type-Options", "nosniff");
	const outcome: TelemetryOutcome =
		response.headers.get("X-Api-Outcome") === "fallback"
			? "fallback"
			: response.status === 429
				? "quota"
				: response.status >= 500
					? "error"
					: response.status >= 400
						? "error"
						: "success";
	const telemetryEvent = {
		route,
		status: response.status,
		durationMs: Math.max(0, performance.now() - started),
		occurredAt: Date.now(),
		outcome,
		provider: response.headers.get("X-Api-Provider") ?? undefined,
		fallback:
			response.headers.get("X-Api-Fallback") === "true" ||
			response.headers.get("X-Api-Outcome") === "fallback",
		cache: response.headers.get("Cache-Control")?.includes("no-store")
			? "bypass"
			: "miss",
	} as const;
	response.headers.delete("X-Api-Outcome");
	response.headers.delete("X-Api-Provider");
	response.headers.delete("X-Api-Fallback");
	getTelemetryStore().record(telemetryEvent);
	if (process.env.NODE_ENV === "production") {
		void persistObservabilityEvent(
			telemetryEvent,
			new Date(telemetryEvent.occurredAt),
		).catch(() => {});
	}
	if (process.env.NODE_ENV !== "test") {
		console.info(
			JSON.stringify({
				event: "api_request",
				route,
				status: response.status,
				durationMs: Math.round(performance.now() - started),
			}),
		);
	}
	return response;
}

export function reportUnavailable(
	component: "catalog" | "database" | "boundaries" | "layers",
) {
	if (process.env.NODE_ENV !== "test")
		console.warn(JSON.stringify({ event: "data_unavailable", component }));
}
