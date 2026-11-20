\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = market_entry, pg_catalog;

CREATE FUNCTION pg_temp.expect_rejection(statement text, expected_constraint text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    failed_constraint text;
BEGIN
    EXECUTE statement;
    RAISE EXCEPTION 'Expected rejection from %', expected_constraint;
EXCEPTION WHEN check_violation OR foreign_key_violation OR unique_violation THEN
    GET STACKED DIAGNOSTICS failed_constraint = CONSTRAINT_NAME;
    IF failed_constraint IS DISTINCT FROM expected_constraint THEN
        RAISE EXCEPTION 'Expected %, got %', expected_constraint, failed_constraint;
    END IF;
    RAISE NOTICE 'PASS: %', failed_constraint;
END;
$$;

DO $$
DECLARE
    source_a uuid;
    source_b uuid;
    dataset_a uuid;
    geography_a uuid;
    geography_b uuid;
    country_a uuid;
    province_a uuid;
    province_b uuid;
    indicator_a uuid;
    observation_a uuid;
    result_count integer;
    value_gap numeric;
BEGIN
    INSERT INTO source_registry (publisher, title, source_type, license, access_right, citation_text)
    VALUES ('Test publisher A', 'Test source A', 'manual', 'Synthetic fixture', 'internal', 'Test only')
    RETURNING source_id INTO source_a;
    INSERT INTO source_registry (publisher, title, source_type, license, access_right, citation_text)
    VALUES ('Test publisher B', 'Test source B', 'manual', 'Synthetic fixture', 'internal', 'Test only')
    RETURNING source_id INTO source_b;
    INSERT INTO dataset_versions (source_id, dataset_code, version_label)
    VALUES (source_a, 'test-market', 'v1') RETURNING dataset_version_id INTO dataset_a;

    INSERT INTO geography_versions (code, name, authority_source_id, effective_from)
    VALUES ('TEST-V1', 'Test version A', source_a, '2025-01-01') RETURNING geography_version_id INTO geography_a;
    INSERT INTO geography_versions (code, name, authority_source_id, effective_from)
    VALUES ('TEST-V2', 'Test version B', source_a, '2026-01-01') RETURNING geography_version_id INTO geography_b;
    INSERT INTO geo_units (geography_version_id, admin_code, name, display_name, normalized_name, level, valid_from)
    VALUES (geography_a, 'TEST', 'Test country', 'Test country', 'test country', 'country', '2025-01-01')
    RETURNING geo_id INTO country_a;
    INSERT INTO geo_units (geography_version_id, admin_code, name, display_name, normalized_name, level, parent_geo_id, valid_from)
    VALUES (geography_a, 'TEST-A', 'Test province A', 'Test province A', 'test province a', 'province', country_a, '2025-01-01')
    RETURNING geo_id INTO province_a;
    INSERT INTO geo_units (geography_version_id, admin_code, name, display_name, normalized_name, level, parent_geo_id, valid_from)
    VALUES (geography_a, 'TEST-B', 'Test province B', 'Test province B', 'test province b', 'province', country_a, '2025-01-01')
    RETURNING geo_id INTO province_b;

    INSERT INTO indicator_definitions (code, label, description, domain, value_type, unit, period_type)
    VALUES ('TEST-PERCENT', 'Test share', 'Synthetic indicator', 'economy', 'percent', '%', 'year')
    RETURNING indicator_id INTO indicator_a;
    INSERT INTO observations (geo_id, indicator_id, period_start, period_end, period_label, value_numeric,
                              value_type, unit, scope, source_id, dataset_version_id, quality_status)
    VALUES (province_a, indicator_a, '2025-01-01', '2025-12-31', '2025', 38.6,
            'percent', '%', 'total', source_a, dataset_a, 'supported')
    RETURNING observation_id INTO observation_a;
    INSERT INTO observations (geo_id, indicator_id, period_start, period_end, period_label, value_numeric,
                              value_type, unit, scope, source_id, dataset_version_id, quality_status)
    VALUES (province_b, indicator_a, '2025-01-01', '2025-12-31', '2025', 25.0,
            'percent', '%', 'total', source_a, dataset_a, 'supported');
    INSERT INTO observations (geo_id, indicator_id, period_start, period_end, period_label, value_type,
                              unit, scope, source_id, dataset_version_id, quality_status, missing_reason)
    VALUES (province_b, indicator_a, '2025-01-01', '2025-12-31', '2025', 'percent', '%',
            'urban', source_a, dataset_a, 'unavailable', 'no_data');

    SELECT count(*), max(o.value_numeric) - min(o.value_numeric)
    INTO result_count, value_gap
    FROM observations AS o
    JOIN geo_units AS g ON g.geo_id = o.geo_id
    JOIN dataset_versions AS d ON (d.dataset_version_id, d.source_id) = (o.dataset_version_id, o.source_id)
    JOIN source_registry AS s ON s.source_id = d.source_id
    WHERE o.indicator_id = indicator_a AND o.period_start = DATE '2025-01-01'
      AND o.period_end = DATE '2025-12-31' AND o.unit = '%' AND o.scope = 'total'
      AND g.geography_version_id = geography_a AND g.level = 'province'
      AND d.dataset_version_id = dataset_a AND s.source_id = source_a
      AND g.geo_id IN (province_a, province_b) AND o.quality_status <> 'unavailable';
    IF result_count <> 2 OR value_gap IS DISTINCT FROM 13.6::numeric THEN
        RAISE EXCEPTION 'Expected two comparable observations with a gap of 13.6, got % and %', result_count, value_gap;
    END IF;
    RAISE NOTICE 'PASS: two comparable observations with source provenance';

    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET value_numeric = 101 WHERE observation_id = %L', observation_a),
        'observations_value_check');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET value_numeric = ''NaN'' WHERE observation_id = %L', observation_a),
        'observations_value_check');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET value_numeric = 0 WHERE geo_id = %L AND scope = ''urban''', province_b),
        'observations_value_check');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET missing_reason = NULL WHERE geo_id = %L AND scope = ''urban''', province_b),
        'observations_value_check');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET period_end = ''2024-12-31'' WHERE observation_id = %L', observation_a),
        'observations_period_check');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET unit = ''people'' WHERE observation_id = %L', observation_a),
        'observations_indicator_fkey');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET source_id = %L WHERE observation_id = %L', source_b, observation_a),
        'observations_dataset_source_fkey');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET geo_id = %L WHERE observation_id = %L', gen_random_uuid(), observation_a),
        'observations_geo_id_fkey');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE observations SET geo_id = %L WHERE observation_id = %L', province_b, observation_a),
        'observations_natural_key');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE geo_units SET parent_geo_id = %L WHERE geo_id = %L', province_b, province_a),
        'geo_units_parent_fkey');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE geo_units SET geography_version_id = %L WHERE geo_id = %L', geography_b, province_a),
        'geo_units_parent_fkey');
    PERFORM pg_temp.expect_rejection(format(
        'UPDATE source_registry SET license = '' '' WHERE source_id = %L', source_a),
        'source_registry_license_check');
END;
$$;

ROLLBACK;
