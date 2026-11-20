-- Core market data from sections 8.2, 9 and 10.2 of the build specification.
BEGIN;

CREATE SCHEMA market_entry;
SET LOCAL search_path = market_entry, pg_catalog;

CREATE TABLE source_registry (
    source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher text NOT NULL,
    title text NOT NULL,
    url text,
    source_type text NOT NULL CHECK (source_type IN ('official', 'survey', 'partner', 'model', 'manual')),
    license text NOT NULL CHECK (btrim(license) <> ''),
    access_right text NOT NULL CHECK (access_right IN ('public', 'internal', 'restricted')),
    collected_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,
    citation_text text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked'))
);

CREATE TABLE dataset_versions (
    dataset_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES source_registry (source_id),
    dataset_code text NOT NULL,
    version_label text NOT NULL,
    checksum text,
    published_at timestamptz,
    UNIQUE (source_id, dataset_code, version_label),
    UNIQUE (dataset_version_id, source_id)
);

CREATE TABLE geography_versions (
    geography_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    authority_source_id uuid NOT NULL REFERENCES source_registry (source_id),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
    CHECK (effective_to >= effective_from)
);

CREATE TABLE geo_units (
    geo_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geography_version_id uuid NOT NULL REFERENCES geography_versions (geography_version_id),
    admin_code text NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    normalized_name text NOT NULL,
    level text NOT NULL CHECK (level IN ('country', 'province', 'commune')),
    parent_geo_id uuid,
    parent_level text GENERATED ALWAYS AS (
        CASE level WHEN 'province' THEN 'country' WHEN 'commune' THEN 'province' END
    ) STORED,
    valid_from date NOT NULL,
    valid_to date,
    UNIQUE (geography_version_id, admin_code),
    UNIQUE (geo_id, geography_version_id, level),
    CHECK (valid_to >= valid_from),
    CHECK ((level = 'country') = (parent_geo_id IS NULL)),
    CONSTRAINT geo_units_parent_fkey
        FOREIGN KEY (parent_geo_id, geography_version_id, parent_level)
        REFERENCES geo_units (geo_id, geography_version_id, level)
);

CREATE TABLE indicator_definitions (
    indicator_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    label text NOT NULL,
    description text NOT NULL,
    domain text NOT NULL,
    value_type text NOT NULL CHECK (value_type IN ('integer', 'decimal', 'percent', 'text', 'category')),
    unit text NOT NULL CHECK (btrim(unit) <> ''),
    period_type text NOT NULL CHECK (period_type IN ('point', 'month', 'quarter', 'year', 'survey')),
    polarity text NOT NULL DEFAULT 'context_only' CHECK (polarity IN ('higher', 'lower', 'neutral', 'context_only')),
    is_proxy boolean NOT NULL DEFAULT false,
    score_eligible boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
    UNIQUE (indicator_id, unit, value_type),
    CHECK (polarity <> 'context_only' OR NOT score_eligible)
);

CREATE TABLE observations (
    observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geo_id uuid NOT NULL REFERENCES geo_units (geo_id),
    indicator_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    period_label text NOT NULL,
    value_numeric numeric,
    value_text text,
    value_type text NOT NULL,
    unit text NOT NULL,
    scope text NOT NULL CHECK (btrim(scope) <> ''),
    source_id uuid NOT NULL,
    dataset_version_id uuid NOT NULL,
    quality_status text NOT NULL CHECK (quality_status IN ('verified', 'supported', 'unavailable')),
    missing_reason text CHECK (missing_reason IN ('no_data', 'not_applicable', 'not_comparable', 'restricted')),
    verified_at timestamptz,
    method_note text,
    limitations text,
    CONSTRAINT observations_indicator_fkey
        FOREIGN KEY (indicator_id, unit, value_type)
        REFERENCES indicator_definitions (indicator_id, unit, value_type),
    CONSTRAINT observations_dataset_source_fkey
        FOREIGN KEY (dataset_version_id, source_id)
        REFERENCES dataset_versions (dataset_version_id, source_id),
    CONSTRAINT observations_natural_key
        UNIQUE (geo_id, indicator_id, period_start, period_end, scope, dataset_version_id),
    CONSTRAINT observations_period_check CHECK (period_end >= period_start),
    CONSTRAINT observations_value_check CHECK (
        CASE
            WHEN quality_status = 'unavailable' THEN
                value_numeric IS NULL AND value_text IS NULL AND missing_reason IS NOT NULL
            WHEN value_type IN ('text', 'category') THEN
                value_numeric IS NULL AND value_text IS NOT NULL AND btrim(value_text) <> ''
                AND missing_reason IS NULL
            ELSE
                value_numeric IS NOT NULL AND value_text IS NULL AND missing_reason IS NULL
                AND value_numeric > '-Infinity'::numeric AND value_numeric < 'Infinity'::numeric
                AND (value_type <> 'integer' OR value_numeric = trunc(value_numeric))
                AND (value_type <> 'percent' OR value_numeric BETWEEN 0 AND 100)
        END
    )
);

CREATE INDEX geo_units_normalized_name_idx ON geo_units (normalized_name);
CREATE INDEX geo_units_parent_idx ON geo_units (parent_geo_id);
CREATE INDEX observations_indicator_period_idx ON observations (indicator_id, period_start, period_end);

COMMENT ON SCHEMA market_entry IS 'Core market data and provenance for the market entry build specification.';
COMMENT ON COLUMN observations.value_numeric IS 'Percent convention: 38.6 means 38.6 percent.';

COMMIT;
