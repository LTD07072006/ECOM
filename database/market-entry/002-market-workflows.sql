-- Apply after schema.sql. Extends the data model without replacing its six tables.
BEGIN;
SET LOCAL search_path = market_entry, pg_catalog;

CREATE TABLE organizations (
    organization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (btrim(name) <> ''),
    country_code text CHECK (country_code ~ '^[A-Z]{2}$'),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (organization_id),
    email text NOT NULL CHECK (email = btrim(email) AND email <> ''),
    display_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('visitor', 'investor', 'analyst', 'steward', 'reviewer', 'admin')),
    status text NOT NULL DEFAULT 'invited' CHECK (status IN ('active', 'locked', 'invited')),
    last_login_at timestamptz
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE sectors (
    sector_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name_vi text NOT NULL,
    name_en text
);

CREATE TABLE segments (
    segment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id uuid NOT NULL REFERENCES sectors (sector_id),
    code text NOT NULL,
    name text NOT NULL,
    customer_type text NOT NULL CHECK (customer_type IN ('b2c', 'b2b')),
    UNIQUE (sector_id, code),
    UNIQUE (segment_id, sector_id)
);

ALTER TABLE geo_units ADD UNIQUE (geo_id, geography_version_id);

CREATE TABLE geo_boundaries (
    boundary_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geo_id uuid NOT NULL REFERENCES geo_units (geo_id),
    dataset_version_id uuid NOT NULL,
    source_id uuid NOT NULL,
    geojson jsonb NOT NULL,
    checksum text NOT NULL CHECK (btrim(checksum) <> ''),
    license_status text NOT NULL CHECK (license_status IN ('allowed', 'restricted', 'unknown')),
    valid_from date NOT NULL,
    UNIQUE (geo_id, dataset_version_id),
    CONSTRAINT geo_boundaries_source_fkey
        FOREIGN KEY (dataset_version_id, source_id) REFERENCES dataset_versions (dataset_version_id, source_id),
    CONSTRAINT geo_boundaries_geojson_check CHECK ((
        jsonb_typeof(geojson) = 'object'
        AND geojson->>'type' IN ('Polygon', 'MultiPolygon')
        AND jsonb_typeof(geojson->'coordinates') = 'array'
        AND NOT (geojson ? 'crs')
    ) IS TRUE)
);
COMMENT ON COLUMN geo_boundaries.geojson IS 'GeoJSON geometry in WGS 84 longitude/latitude. Validate topology and coordinate ranges before import.';

CREATE TABLE geo_crosswalks (
    crosswalk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_geo_id uuid NOT NULL,
    from_geo_version_id uuid NOT NULL,
    to_geo_id uuid NOT NULL,
    to_geo_version_id uuid NOT NULL,
    source_id uuid NOT NULL REFERENCES source_registry (source_id),
    allocation_method text NOT NULL CHECK (allocation_method IN ('official', 'manual', 'area', 'population', 'model')),
    allocation_ratio numeric CHECK (allocation_ratio BETWEEN 0 AND 1),
    approval_status text NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'approved', 'rejected')),
    reviewed_by uuid REFERENCES users (user_id),
    reviewed_at timestamptz,
    notes text,
    UNIQUE (from_geo_id, to_geo_id, source_id, allocation_method),
    FOREIGN KEY (from_geo_id, from_geo_version_id) REFERENCES geo_units (geo_id, geography_version_id),
    CONSTRAINT geo_crosswalks_destination_fkey
        FOREIGN KEY (to_geo_id, to_geo_version_id) REFERENCES geo_units (geo_id, geography_version_id),
    CHECK (from_geo_version_id <> to_geo_version_id),
    CONSTRAINT geo_crosswalks_review_check
        CHECK (approval_status = 'draft' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE VIEW approved_geo_crosswalks AS
SELECT * FROM geo_crosswalks WHERE approval_status = 'approved';

CREATE TABLE market_scenarios (
    market_scenario_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by uuid NOT NULL REFERENCES users (user_id),
    sector_id uuid NOT NULL REFERENCES sectors (sector_id),
    segment_id uuid,
    name text NOT NULL CHECK (btrim(name) <> ''),
    research_objective text,
    channel text CHECK (channel IN ('online', 'offline', 'both')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'researching', 'ready_for_review', 'reviewed', 'exported', 'archived'
    )),
    reviewed_by uuid REFERENCES users (user_id),
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (segment_id, sector_id) REFERENCES segments (segment_id, sector_id),
    CHECK (status NOT IN ('reviewed', 'exported') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE TABLE market_scenario_geographies (
    market_scenario_id uuid NOT NULL REFERENCES market_scenarios (market_scenario_id),
    geo_id uuid NOT NULL REFERENCES geo_units (geo_id),
    PRIMARY KEY (market_scenario_id, geo_id)
);

CREATE TABLE survey_studies (
    study_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id uuid NOT NULL REFERENCES sectors (sector_id),
    target_segment_id uuid NOT NULL,
    source_id uuid NOT NULL,
    dataset_version_id uuid NOT NULL,
    name text NOT NULL,
    study_type text NOT NULL CHECK (study_type IN ('interview', 'survey', 'observation', 'pilot')),
    method text NOT NULL,
    sampling_method text NOT NULL,
    fieldwork_start date NOT NULL,
    fieldwork_end date NOT NULL,
    sample_size integer NOT NULL CHECK (sample_size > 0),
    response_rate numeric CHECK (response_rate BETWEEN 0 AND 100),
    representativeness_note text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published', 'retired')),
    UNIQUE (study_id, sector_id),
    FOREIGN KEY (target_segment_id, sector_id) REFERENCES segments (segment_id, sector_id),
    FOREIGN KEY (dataset_version_id, source_id) REFERENCES dataset_versions (dataset_version_id, source_id),
    CHECK (fieldwork_end >= fieldwork_start)
);

CREATE TABLE survey_questions (
    question_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id uuid NOT NULL REFERENCES survey_studies (study_id),
    question_code text NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL CHECK (question_type IN ('single', 'multiple', 'scale', 'open', 'range')),
    construct text NOT NULL CHECK (construct IN ('need', 'want', 'channel', 'wtp', 'frequency', 'criteria')),
    response_unit text NOT NULL,
    UNIQUE (study_id, question_code),
    UNIQUE (question_id, study_id, response_unit)
);

CREATE TABLE survey_aggregates (
    aggregate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id uuid NOT NULL,
    question_id uuid NOT NULL,
    sector_id uuid NOT NULL,
    segment_id uuid NOT NULL,
    geo_id uuid REFERENCES geo_units (geo_id),
    n integer NOT NULL CHECK (n > 0),
    estimate_numeric numeric,
    estimate_unit text NOT NULL,
    category text,
    quality_status text NOT NULL CHECK (quality_status IN ('verified', 'supported', 'unavailable')),
    publication_note text NOT NULL,
    CONSTRAINT survey_aggregates_question_fkey
        FOREIGN KEY (question_id, study_id, estimate_unit)
        REFERENCES survey_questions (question_id, study_id, response_unit),
    FOREIGN KEY (study_id, sector_id) REFERENCES survey_studies (study_id, sector_id),
    FOREIGN KEY (segment_id, sector_id) REFERENCES segments (segment_id, sector_id),
    UNIQUE NULLS NOT DISTINCT (question_id, segment_id, geo_id, category),
    CONSTRAINT survey_aggregates_estimate_check CHECK (
        (quality_status = 'unavailable') = (estimate_numeric IS NULL)
        AND (estimate_numeric IS NULL OR (
            estimate_numeric > '-Infinity'::numeric AND estimate_numeric < 'Infinity'::numeric
            AND (estimate_unit <> '%' OR estimate_numeric BETWEEN 0 AND 100)
        ))
    )
);

CREATE TABLE market_actors (
    actor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geo_id uuid NOT NULL REFERENCES geo_units (geo_id),
    sector_id uuid REFERENCES sectors (sector_id),
    source_id uuid NOT NULL,
    dataset_version_id uuid NOT NULL,
    name text NOT NULL,
    actor_type text NOT NULL CHECK (actor_type IN ('competitor', 'supplier', 'distributor', 'store', 'warehouse', 'other')),
    address text,
    latitude numeric CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric CHECK (longitude BETWEEN -180 AND 180),
    quality_status text NOT NULL CHECK (quality_status IN ('verified', 'supported', 'unverified', 'rejected')),
    checked_at timestamptz,
    FOREIGN KEY (dataset_version_id, source_id) REFERENCES dataset_versions (dataset_version_id, source_id),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE research_gaps (
    research_gap_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    market_scenario_id uuid NOT NULL REFERENCES market_scenarios (market_scenario_id),
    geo_id uuid,
    indicator_id uuid REFERENCES indicator_definitions (indicator_id),
    description text NOT NULL CHECK (btrim(description) <> ''),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    FOREIGN KEY (market_scenario_id, geo_id) REFERENCES market_scenario_geographies (market_scenario_id, geo_id),
    CHECK ((status = 'resolved') = (resolved_at IS NOT NULL)),
    CHECK (resolved_at >= created_at)
);

CREATE TABLE decision_scenarios (
    decision_scenario_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    market_scenario_id uuid NOT NULL REFERENCES market_scenarios (market_scenario_id),
    created_by uuid NOT NULL REFERENCES users (user_id),
    name text NOT NULL,
    chosen_period_start date NOT NULL,
    chosen_period_end date NOT NULL CHECK (chosen_period_end >= chosen_period_start),
    missing_data_policy text NOT NULL DEFAULT 'reject' CHECK (missing_data_policy IN ('reject', 'partial', 'qualitative')),
    formula_version text NOT NULL CHECK (btrim(formula_version) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (decision_scenario_id, market_scenario_id)
);

ALTER TABLE indicator_definitions ADD UNIQUE (indicator_id, score_eligible);

CREATE TABLE decision_criteria (
    decision_scenario_id uuid NOT NULL REFERENCES decision_scenarios (decision_scenario_id),
    indicator_id uuid NOT NULL,
    score_eligible boolean GENERATED ALWAYS AS (true) STORED,
    label text NOT NULL,
    weight numeric NOT NULL CHECK (weight BETWEEN 0 AND 1),
    is_required boolean NOT NULL DEFAULT true,
    PRIMARY KEY (decision_scenario_id, indicator_id),
    CONSTRAINT decision_criteria_eligible_indicator_fkey
        FOREIGN KEY (indicator_id, score_eligible) REFERENCES indicator_definitions (indicator_id, score_eligible)
);

CREATE TABLE decision_runs (
    run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_scenario_id uuid NOT NULL,
    market_scenario_id uuid NOT NULL,
    calculated_at timestamptz NOT NULL DEFAULT now(),
    configuration_snapshot jsonb NOT NULL CHECK (jsonb_typeof(configuration_snapshot) = 'object'),
    dataset_snapshot jsonb NOT NULL CHECK (jsonb_typeof(dataset_snapshot) = 'object'),
    UNIQUE (run_id, market_scenario_id),
    FOREIGN KEY (decision_scenario_id, market_scenario_id)
        REFERENCES decision_scenarios (decision_scenario_id, market_scenario_id)
);

CREATE TABLE decision_results (
    run_id uuid NOT NULL,
    market_scenario_id uuid NOT NULL,
    geo_id uuid NOT NULL,
    criterion_scores jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(criterion_scores) = 'object'),
    overall_score numeric CHECK (overall_score BETWEEN 0 AND 100),
    rank integer CHECK (rank > 0),
    coverage numeric NOT NULL CHECK (coverage BETWEEN 0 AND 1),
    eligibility_status text NOT NULL CHECK (eligibility_status IN ('eligible', 'partial', 'ineligible', 'insufficient')),
    missing_items jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(missing_items) = 'array'),
    warnings jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(warnings) = 'array'),
    PRIMARY KEY (run_id, geo_id),
    FOREIGN KEY (run_id, market_scenario_id) REFERENCES decision_runs (run_id, market_scenario_id),
    CONSTRAINT decision_results_geography_fkey
        FOREIGN KEY (market_scenario_id, geo_id) REFERENCES market_scenario_geographies (market_scenario_id, geo_id),
    CONSTRAINT decision_results_score_check CHECK (
        (eligibility_status IN ('eligible', 'partial')) = (overall_score IS NOT NULL)
        AND (rank IS NULL OR eligibility_status = 'eligible')
        AND (eligibility_status <> 'partial' OR coverage < 1)
    )
);

CREATE TABLE export_jobs (
    export_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    market_scenario_id uuid NOT NULL REFERENCES market_scenarios (market_scenario_id),
    run_id uuid,
    requested_by uuid NOT NULL REFERENCES users (user_id),
    format text NOT NULL CHECK (format IN ('pdf', 'xlsx', 'csv', 'json')),
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    report_snapshot jsonb NOT NULL CHECK (jsonb_typeof(report_snapshot) = 'object'),
    output_uri text,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    FOREIGN KEY (run_id, market_scenario_id) REFERENCES decision_runs (run_id, market_scenario_id),
    CHECK ((status IN ('succeeded', 'failed')) = (completed_at IS NOT NULL)),
    CHECK (status <> 'succeeded' OR output_uri IS NOT NULL),
    CHECK (completed_at >= created_at)
);

CREATE TABLE audit_events (
    audit_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users (user_id),
    action text NOT NULL CHECK (btrim(action) <> ''),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX geo_crosswalks_to_geo_idx ON geo_crosswalks (to_geo_id);
CREATE INDEX market_scenarios_creator_idx ON market_scenarios (created_by, created_at DESC);
CREATE INDEX survey_studies_sector_segment_idx ON survey_studies (sector_id, target_segment_id);
CREATE INDEX market_actors_geo_sector_idx ON market_actors (geo_id, sector_id);
CREATE INDEX decision_runs_scenario_time_idx ON decision_runs (decision_scenario_id, calculated_at DESC);
CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id, occurred_at DESC);

COMMIT;
