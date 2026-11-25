CREATE TABLE IF NOT EXISTS market_entry.api_observability_buckets (
  bucket_start timestamptz NOT NULL,
  route text NOT NULL,
  provider text NOT NULL,
  status integer NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  quota integer NOT NULL DEFAULT 0,
  fallbacks integer NOT NULL DEFAULT 0,
  cache_hits integer NOT NULL DEFAULT 0,
  cache_misses integer NOT NULL DEFAULT 0,
  latencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_start, route, provider, status)
);
CREATE INDEX IF NOT EXISTS api_observability_buckets_route_idx
  ON market_entry.api_observability_buckets (route, bucket_start);
CREATE INDEX IF NOT EXISTS api_observability_buckets_created_idx
  ON market_entry.api_observability_buckets (created_at);
