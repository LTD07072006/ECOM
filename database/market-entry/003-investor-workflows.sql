-- Apply after 002-market-workflows.sql.
BEGIN;
SET LOCAL search_path = market_entry, pg_catalog;

CREATE TABLE legal_references (
    legal_reference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL,
    dataset_version_id uuid NOT NULL,
    document_code text NOT NULL,
    title text NOT NULL,
    issuing_authority text NOT NULL,
    issued_on date NOT NULL,
    effective_from date,
    effective_to date,
    official_url text NOT NULL CHECK (btrim(official_url) <> ''),
    status text NOT NULL DEFAULT 'pending_review' CHECK (status IN (
        'pending_review', 'effective', 'partially_effective', 'expired', 'repealed'
    )),
    reviewed_by uuid REFERENCES users (user_id),
    reviewed_at timestamptz,
    notes text,
    UNIQUE (document_code, dataset_version_id),
    FOREIGN KEY (dataset_version_id, source_id) REFERENCES dataset_versions (dataset_version_id, source_id),
    CHECK (effective_to >= effective_from),
    CHECK (status = 'pending_review' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE TABLE entry_requirements (
    requirement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_reference_id uuid NOT NULL REFERENCES legal_references (legal_reference_id),
    sector_id uuid REFERENCES sectors (sector_id),
    geo_id uuid REFERENCES geo_units (geo_id),
    investor_type text,
    channel text CHECK (channel IN ('online', 'offline', 'both')),
    title text NOT NULL,
    checklist_item text NOT NULL,
    review_status text NOT NULL DEFAULT 'needs_check' CHECK (review_status IN ('needs_check', 'reviewed', 'retired'))
);

CREATE TABLE investment_contacts (
    contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (organization_id),
    sector_id uuid REFERENCES sectors (sector_id),
    geo_id uuid REFERENCES geo_units (geo_id),
    contact_name text,
    email text NOT NULL CHECK (btrim(email) <> ''),
    phone text,
    routing_priority integer NOT NULL DEFAULT 100 CHECK (routing_priority > 0),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE investment_opportunities (
    opportunity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geo_id uuid NOT NULL REFERENCES geo_units (geo_id),
    contact_id uuid REFERENCES investment_contacts (contact_id),
    source_id uuid NOT NULL,
    dataset_version_id uuid NOT NULL,
    code text NOT NULL UNIQUE,
    title_vi text NOT NULL,
    title_en text,
    description_vi text NOT NULL,
    description_en text,
    opportunity_type text NOT NULL CHECK (opportunity_type IN ('project', 'site', 'industrial_park', 'partnership', 'other')),
    investment_range_min numeric CHECK (investment_range_min >= 0 AND investment_range_min < 'Infinity'::numeric),
    investment_range_max numeric CHECK (investment_range_max >= 0 AND investment_range_max < 'Infinity'::numeric),
    investment_currency text CHECK (investment_currency ~ '^[A-Z]{3}$'),
    area_value numeric CHECK (area_value > 0 AND area_value < 'Infinity'::numeric),
    area_unit text CHECK (area_unit IN ('ha', 'm2', 'km2')),
    readiness_status text NOT NULL DEFAULT 'early_stage' CHECK (readiness_status IN ('early_stage', 'available', 'under_review', 'closed')),
    legal_status text NOT NULL DEFAULT 'not_reviewed' CHECK (legal_status IN ('not_reviewed', 'source_recorded', 'needs_check', 'verified_separately')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'expired', 'archived')),
    published_at timestamptz,
    expires_at timestamptz,
    FOREIGN KEY (dataset_version_id, source_id) REFERENCES dataset_versions (dataset_version_id, source_id),
    CHECK (investment_range_min <= investment_range_max),
    CHECK ((investment_currency IS NOT NULL) = (num_nonnulls(investment_range_min, investment_range_max) > 0)),
    CHECK ((area_value IS NULL) = (area_unit IS NULL)),
    CHECK (expires_at > published_at),
    CONSTRAINT investment_opportunities_publish_check CHECK (
        status <> 'published' OR (
            published_at IS NOT NULL AND nullif(btrim(title_en), '') IS NOT NULL
            AND nullif(btrim(description_en), '') IS NOT NULL
        )
    )
);

CREATE TABLE opportunity_sectors (
    opportunity_id uuid NOT NULL REFERENCES investment_opportunities (opportunity_id),
    sector_id uuid NOT NULL REFERENCES sectors (sector_id),
    PRIMARY KEY (opportunity_id, sector_id)
);

CREATE TABLE investment_incentives (
    incentive_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_reference_id uuid NOT NULL REFERENCES legal_references (legal_reference_id),
    sector_id uuid REFERENCES sectors (sector_id),
    geo_id uuid REFERENCES geo_units (geo_id),
    investor_type text,
    title text NOT NULL,
    description text NOT NULL,
    eligibility_note text NOT NULL,
    valid_from date,
    valid_to date,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'expired')),
    CHECK (valid_to >= valid_from)
);

CREATE TABLE opportunity_incentives (
    opportunity_id uuid NOT NULL REFERENCES investment_opportunities (opportunity_id),
    incentive_id uuid NOT NULL REFERENCES investment_incentives (incentive_id),
    PRIMARY KEY (opportunity_id, incentive_id)
);

CREATE TABLE investor_profiles (
    investor_profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geo_id uuid REFERENCES geo_units (geo_id),
    sector_id uuid REFERENCES sectors (sector_id),
    opportunity_id uuid REFERENCES investment_opportunities (opportunity_id),
    source_id uuid NOT NULL,
    dataset_version_id uuid NOT NULL,
    language text NOT NULL CHECK (language IN ('vi', 'en')),
    title text NOT NULL,
    summary text NOT NULL,
    cta_config jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(cta_config) = 'object'),
    last_updated_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published', 'expired')),
    FOREIGN KEY (dataset_version_id, source_id) REFERENCES dataset_versions (dataset_version_id, source_id),
    CONSTRAINT investor_profiles_subject_check CHECK (num_nonnulls(geo_id, sector_id, opportunity_id) = 1),
    UNIQUE NULLS NOT DISTINCT (geo_id, sector_id, opportunity_id, language)
);

CREATE TABLE investment_inquiries (
    inquiry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id uuid NOT NULL REFERENCES sectors (sector_id),
    geo_id uuid REFERENCES geo_units (geo_id),
    opportunity_id uuid,
    assigned_contact_id uuid REFERENCES investment_contacts (contact_id),
    investor_name text NOT NULL,
    company_name text NOT NULL,
    country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    business_email text NOT NULL CHECK (btrim(business_email) <> ''),
    job_title text,
    phone text,
    investment_type text CHECK (investment_type IN ('greenfield', 'jv', 'ma', 'expansion', 'other')),
    expected_timeline text,
    support_requested text[] NOT NULL CHECK (cardinality(support_requested) > 0),
    message text,
    consent_version text NOT NULL CHECK (btrim(consent_version) <> ''),
    consented_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'assigned', 'in_progress', 'contacted', 'qualified', 'closed'
    )),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT investment_inquiries_opportunity_sector_fkey
        FOREIGN KEY (opportunity_id, sector_id) REFERENCES opportunity_sectors (opportunity_id, sector_id),
    CONSTRAINT investment_inquiries_consent_check CHECK (consented_at <= created_at),
    CONSTRAINT investment_inquiries_assignment_check
        CHECK (status IN ('submitted', 'closed') OR assigned_contact_id IS NOT NULL)
);

CREATE TABLE shortlist_items (
    shortlist_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (user_id),
    geo_id uuid REFERENCES geo_units (geo_id),
    opportunity_id uuid REFERENCES investment_opportunities (opportunity_id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(geo_id, opportunity_id) = 1),
    UNIQUE NULLS NOT DISTINCT (user_id, geo_id, opportunity_id)
);

CREATE TABLE conversion_events (
    event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users (user_id),
    anonymous_session_id uuid,
    investor_profile_id uuid REFERENCES investor_profiles (investor_profile_id),
    opportunity_id uuid REFERENCES investment_opportunities (opportunity_id),
    geo_id uuid REFERENCES geo_units (geo_id),
    event_type text NOT NULL CHECK (event_type IN (
        'profile_view', 'map_interaction', 'opportunity_view', 'shortlist', 'download', 'inquiry'
    )),
    language text CHECK (language IN ('vi', 'en')),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(user_id, anonymous_session_id) >= 1),
    CHECK (num_nonnulls(investor_profile_id, opportunity_id, geo_id) <= 1)
);

CREATE INDEX entry_requirements_sector_geo_idx ON entry_requirements (sector_id, geo_id);
CREATE INDEX investment_contacts_routing_idx ON investment_contacts (sector_id, geo_id, routing_priority) WHERE status = 'active';
CREATE INDEX investment_opportunities_geo_status_idx ON investment_opportunities (geo_id, status);
CREATE INDEX opportunity_sectors_sector_idx ON opportunity_sectors (sector_id, opportunity_id);
CREATE INDEX investment_inquiries_queue_idx ON investment_inquiries (assigned_contact_id, status, created_at);
CREATE INDEX conversion_events_type_time_idx ON conversion_events (event_type, occurred_at);

COMMIT;
