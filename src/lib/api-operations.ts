import { databasePool } from "../db/pool";
import { error } from "./http";

const limits = { search: 180, profile: 180, compare: 60, export: 30, internal: 120 } as const;
type QuotaRoute = keyof typeof limits;
type Route = QuotaRoute | "boundaries" | "layers" | "health";
const minute = 60_000;
const localQuotas = new Map<QuotaRoute, { window: number; count: number }>();
const quotaRoutes = new Set<string>(Object.keys(limits));

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

async function takeQuota(route: QuotaRoute) {
  const limit = limits[route];
  if (process.env.NODE_ENV === "production") {
    const sql = databasePool();
    const [bucket] = await sql<{ requests: number; retry_after: number }[]>`
      insert into market_entry.api_quotas (route, window_start, requests)
      values (${route}, date_trunc('minute', statement_timestamp()), 1)
      on conflict (route) do update set
        requests = case when api_quotas.window_start < excluded.window_start then 1
          else least(api_quotas.requests + 1, ${limit + 1}) end,
        window_start = greatest(api_quotas.window_start, excluded.window_start)
      returning requests,
        greatest(1, ceil(extract(epoch from (window_start + interval '1 minute' - clock_timestamp()))))::int as retry_after
    `;
    return bucket.requests > limit ? bucket.retry_after : 0;
  }

  const now = Date.now();
  const window = Math.floor(now / minute);
  const current = localQuotas.get(route);
  const count = current?.window === window ? Math.min(current.count + 1, limit + 1) : 1;
  localQuotas.set(route, { window, count });
  return count > limit ? Math.ceil((minute - now % minute) / 1000) : 0;
}

export async function observeApi(route: Route, handler: () => Promise<Response>) {
  const started = performance.now();
  let response: Response;
  try {
    const wait = quotaRoutes.has(route) ? await takeQuota(route as QuotaRoute) : 0;
    if (wait) {
      response = error("Too many requests. Try again shortly.", 429);
      response.headers.set("Retry-After", String(wait));
    } else {
      response = await handler();
    }
  } catch {
    response = error("The service is temporarily unavailable.", 503);
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (process.env.NODE_ENV !== "test") {
    console.info(JSON.stringify({ event: "api_request", route, status: response.status, durationMs: Math.round(performance.now() - started) }));
  }
  return response;
}

export function reportUnavailable(component: "catalog" | "database" | "boundaries" | "layers") {
  if (process.env.NODE_ENV !== "test") console.warn(JSON.stringify({ event: "data_unavailable", component }));
}
