\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = market_entry, pg_catalog;

CREATE FUNCTION pg_temp.require(condition boolean, test_name text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF condition IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'FAIL: %', test_name;
    END IF;
    RAISE NOTICE 'PASS: %', test_name;
END;
$$;

CREATE FUNCTION pg_temp.reject(statement text, expected_constraint text, test_name text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    failed_constraint text;
BEGIN
    EXECUTE statement;
    RAISE EXCEPTION 'FAIL: % accepted', test_name;
EXCEPTION WHEN check_violation OR foreign_key_violation OR unique_violation THEN
    GET STACKED DIAGNOSTICS failed_constraint = CONSTRAINT_NAME;
    IF failed_constraint IS DISTINCT FROM expected_constraint THEN
        RAISE EXCEPTION 'FAIL: %. Expected %, got %', test_name, expected_constraint, failed_constraint;
    END IF;
    RAISE NOTICE 'PASS: %', test_name;
END;
$$;

DO $$
DECLARE
    source_a uuid;
    dataset_a uuid;
    version_a uuid;
    version_b uuid;
    geo_a uuid;
    geo_b uuid;
    boundary_a uuid;
    crosswalk_a uuid;
    organization_a uuid;
    user_a uuid;
    sector_a uuid;
    sector_b uuid;
    segment_a uuid;
    scenario_a uuid;
    study_a uuid;
    study_b uuid;
    question_a uuid;
    indicator_a uuid;
    context_indicator uuid;
    decision_a uuid;
    run_a uuid;
    run_b uuid;
    legal_a uuid;
    contact_a uuid;
    opportunity_a uuid;
    profile_a uuid;
    inquiry_a uuid;
BEGIN
    INSERT INTO source_registry (publisher, title, source_type, license, access_right, citation_text)
    VALUES ('Workflow test', 'Synthetic release', 'manual', 'Synthetic fixture', 'internal', 'Test only')
    RETURNING source_id INTO source_a;
    INSERT INTO dataset_versions (source_id, dataset_code, version_label)
    VALUES (source_a, 'WORKFLOW-TEST', 'v1') RETURNING dataset_version_id INTO dataset_a;
    INSERT INTO organizations (name) VALUES ('Workflow test organization') RETURNING organization_id INTO organization_a;
    INSERT INTO users (organization_id, email, display_name, role)
    VALUES (organization_a, 'reviewer@workflow.example', 'Test reviewer', 'reviewer') RETURNING user_id INTO user_a;

    INSERT INTO geography_versions (authority_source_id, code, name, effective_from)
    VALUES (source_a, 'WORKFLOW-V1', 'Workflow version 1', '2025-01-01') RETURNING geography_version_id INTO version_a;
    INSERT INTO geography_versions (authority_source_id, code, name, effective_from)
    VALUES (source_a, 'WORKFLOW-V2', 'Workflow version 2', '2026-01-01') RETURNING geography_version_id INTO version_b;
    INSERT INTO geo_units (geography_version_id, admin_code, name, display_name, normalized_name, level, valid_from)
    VALUES (version_a, 'WF', 'Test country', 'Test country', 'test country', 'country', '2025-01-01') RETURNING geo_id INTO geo_a;
    INSERT INTO geo_units (geography_version_id, admin_code, name, display_name, normalized_name, level, valid_from)
    VALUES (version_b, 'WF', 'Test country', 'Test country', 'test country', 'country', '2026-01-01') RETURNING geo_id INTO geo_b;
    INSERT INTO geo_boundaries (geo_id, dataset_version_id, source_id, geojson, checksum, license_status, valid_from)
    VALUES (geo_a, dataset_a, source_a, '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}',
            'fixture-checksum', 'allowed', '2025-01-01') RETURNING boundary_id INTO boundary_a;
    PERFORM pg_temp.reject(format(
        'UPDATE geo_boundaries SET geojson = %L WHERE boundary_id = %L', '{"type":"Point","coordinates":[0,0]}', boundary_a),
        'geo_boundaries_geojson_check', 'Point cannot be stored as a boundary');
    PERFORM pg_temp.reject(format(
        'UPDATE geo_boundaries SET geojson = %L WHERE boundary_id = %L', '{"type":"Polygon"}', boundary_a),
        'geo_boundaries_geojson_check', 'Boundary requires a coordinates array');

    INSERT INTO geo_crosswalks (from_geo_id, from_geo_version_id, to_geo_id, to_geo_version_id, source_id, allocation_method, allocation_ratio)
    VALUES (geo_a, version_a, geo_b, version_b, source_a, 'official', 1) RETURNING crosswalk_id INTO crosswalk_a;
    PERFORM pg_temp.require(NOT EXISTS (SELECT FROM approved_geo_crosswalks WHERE crosswalk_id = crosswalk_a), 'Draft crosswalk is excluded');
    PERFORM pg_temp.reject(format('UPDATE geo_crosswalks SET approval_status = ''approved'' WHERE crosswalk_id = %L', crosswalk_a),
        'geo_crosswalks_review_check', 'Crosswalk approval requires a reviewer and date');
    UPDATE geo_crosswalks SET approval_status = 'approved', reviewed_by = user_a, reviewed_at = now() WHERE crosswalk_id = crosswalk_a;
    PERFORM pg_temp.require(EXISTS (SELECT FROM approved_geo_crosswalks WHERE crosswalk_id = crosswalk_a), 'Approved crosswalk is available');

    INSERT INTO sectors (code, name_vi) VALUES ('WORKFLOW-A', 'Test sector A') RETURNING sector_id INTO sector_a;
    INSERT INTO sectors (code, name_vi) VALUES ('WORKFLOW-B', 'Test sector B') RETURNING sector_id INTO sector_b;
    INSERT INTO segments (sector_id, code, name, customer_type)
    VALUES (sector_a, 'TEST-B2B', 'Test segment', 'b2b') RETURNING segment_id INTO segment_a;
    INSERT INTO market_scenarios (created_by, sector_id, segment_id, name)
    VALUES (user_a, sector_a, segment_a, 'Synthetic research') RETURNING market_scenario_id INTO scenario_a;
    INSERT INTO market_scenario_geographies VALUES (scenario_a, geo_a);
    PERFORM pg_temp.reject(format('UPDATE market_scenarios SET sector_id = %L WHERE market_scenario_id = %L', sector_b, scenario_a),
        'market_scenarios_segment_id_sector_id_fkey', 'Scenario segment must belong to its sector');

    INSERT INTO survey_studies (sector_id, target_segment_id, source_id, dataset_version_id, name, study_type,
                                method, sampling_method, fieldwork_start, fieldwork_end, sample_size, representativeness_note)
    VALUES (sector_a, segment_a, source_a, dataset_a, 'Study A', 'survey', 'Synthetic', 'Synthetic', '2025-03-01', '2025-03-02', 25, 'Test only')
    RETURNING study_id INTO study_a;
    INSERT INTO survey_studies (sector_id, target_segment_id, source_id, dataset_version_id, name, study_type,
                                method, sampling_method, fieldwork_start, fieldwork_end, sample_size, representativeness_note)
    VALUES (sector_a, segment_a, source_a, dataset_a, 'Study B', 'survey', 'Synthetic', 'Synthetic', '2025-03-01', '2025-03-02', 25, 'Test only')
    RETURNING study_id INTO study_b;
    INSERT INTO survey_questions (study_id, question_code, question_text, question_type, construct, response_unit)
    VALUES (study_a, 'NEED', 'Synthetic question', 'single', 'need', '%') RETURNING question_id INTO question_a;
    INSERT INTO survey_aggregates (study_id, question_id, sector_id, segment_id, n, estimate_numeric, estimate_unit, quality_status, publication_note)
    VALUES (study_a, question_a, sector_a, segment_a, 25, 64, '%', 'supported', 'Test only');
    PERFORM pg_temp.reject(format('UPDATE survey_aggregates SET study_id = %L WHERE question_id = %L', study_b, question_a),
        'survey_aggregates_question_fkey', 'Aggregate question must belong to the same study');
    PERFORM pg_temp.reject(format('UPDATE survey_aggregates SET estimate_numeric = 101 WHERE question_id = %L', question_a),
        'survey_aggregates_estimate_check', 'Survey percentage must be between 0 and 100');

    INSERT INTO indicator_definitions (code, label, description, domain, value_type, unit, period_type, polarity, score_eligible)
    VALUES ('WORKFLOW-SCORE', 'Test score input', 'Synthetic', 'economy', 'integer', 'count', 'year', 'higher', true)
    RETURNING indicator_id INTO indicator_a;
    INSERT INTO indicator_definitions (code, label, description, domain, value_type, unit, period_type)
    VALUES ('WORKFLOW-CONTEXT', 'Test context', 'Synthetic', 'population', 'integer', 'people', 'year')
    RETURNING indicator_id INTO context_indicator;
    INSERT INTO decision_scenarios (market_scenario_id, created_by, name, chosen_period_start, chosen_period_end, formula_version)
    VALUES (scenario_a, user_a, 'Test decision', '2025-01-01', '2025-12-31', 'test-v1') RETURNING decision_scenario_id INTO decision_a;
    INSERT INTO decision_criteria (decision_scenario_id, indicator_id, label, weight)
    VALUES (decision_a, indicator_a, 'Test criterion', 1);
    PERFORM pg_temp.reject(format('UPDATE decision_criteria SET indicator_id = %L WHERE decision_scenario_id = %L', context_indicator, decision_a),
        'decision_criteria_eligible_indicator_fkey', 'Context-only indicator cannot be used for scoring');
    INSERT INTO decision_runs (decision_scenario_id, market_scenario_id, configuration_snapshot, dataset_snapshot)
    VALUES (decision_a, scenario_a, '{"formula":"test-v1"}', jsonb_build_object('test', dataset_a)) RETURNING run_id INTO run_a;
    INSERT INTO decision_runs (decision_scenario_id, market_scenario_id, configuration_snapshot, dataset_snapshot)
    VALUES (decision_a, scenario_a, '{"formula":"test-v1"}', jsonb_build_object('test', dataset_a)) RETURNING run_id INTO run_b;
    INSERT INTO decision_results (run_id, market_scenario_id, geo_id, coverage, eligibility_status, missing_items)
    VALUES (run_a, scenario_a, geo_a, 0, 'insufficient', '["missing observation"]');
    INSERT INTO decision_results (run_id, market_scenario_id, geo_id, coverage, eligibility_status, overall_score, rank)
    VALUES (run_b, scenario_a, geo_a, 1, 'eligible', 81, 1);
    PERFORM pg_temp.require(
        (SELECT count(*) = 2 FROM decision_results WHERE geo_id = geo_a AND run_id IN (run_a, run_b)),
        'Separate runs retain historical outcomes');
    PERFORM pg_temp.reject(format('UPDATE decision_results SET rank = 1 WHERE run_id = %L', run_a),
        'decision_results_score_check', 'Insufficient results cannot be ranked');
    PERFORM pg_temp.reject(format('UPDATE decision_results SET geo_id = %L WHERE run_id = %L', geo_b, run_b),
        'decision_results_geography_fkey', 'Result geography must belong to the scenario');
    INSERT INTO export_jobs (market_scenario_id, run_id, requested_by, format, report_snapshot)
    VALUES (scenario_a, run_b, user_a, 'csv', '{"format_version":1}');

    INSERT INTO legal_references (source_id, dataset_version_id, document_code, title, issuing_authority, issued_on, official_url)
    VALUES (source_a, dataset_a, 'WORKFLOW-LEGAL', 'Synthetic reference', 'Synthetic authority', '2025-01-01', 'https://workflow.example/test')
    RETURNING legal_reference_id INTO legal_a;
    INSERT INTO entry_requirements (legal_reference_id, sector_id, geo_id, title, checklist_item)
    VALUES (legal_a, sector_a, geo_a, 'Synthetic condition', 'Test only');
    INSERT INTO investment_contacts (organization_id, sector_id, geo_id, email)
    VALUES (organization_a, sector_a, geo_a, 'contact@workflow.example') RETURNING contact_id INTO contact_a;
    INSERT INTO investment_opportunities (geo_id, contact_id, source_id, dataset_version_id, code, title_vi, description_vi, opportunity_type)
    VALUES (geo_a, contact_a, source_a, dataset_a, 'WORKFLOW-OPP', 'Test title', 'Test description', 'project')
    RETURNING opportunity_id INTO opportunity_a;
    PERFORM pg_temp.reject(format('UPDATE investment_opportunities SET status = ''published'', published_at = now() WHERE opportunity_id = %L', opportunity_a),
        'investment_opportunities_publish_check', 'Publication requires bilingual opportunity content');
    UPDATE investment_opportunities SET title_en = 'Test title', description_en = 'Test description',
        status = 'published', published_at = now() WHERE opportunity_id = opportunity_a;
    INSERT INTO opportunity_sectors VALUES (opportunity_a, sector_a);
    INSERT INTO investor_profiles (opportunity_id, source_id, dataset_version_id, language, title, summary, status)
    VALUES (opportunity_a, source_a, dataset_a, 'en', 'Test profile', 'Test summary', 'published') RETURNING investor_profile_id INTO profile_a;
    PERFORM pg_temp.reject(format('UPDATE investor_profiles SET geo_id = %L WHERE investor_profile_id = %L', geo_a, profile_a),
        'investor_profiles_subject_check', 'A profile cannot refer to two subjects');
    INSERT INTO shortlist_items (user_id, opportunity_id) VALUES (user_a, opportunity_a);
    INSERT INTO conversion_events (anonymous_session_id, investor_profile_id, event_type)
    VALUES (gen_random_uuid(), profile_a, 'profile_view');
    INSERT INTO investment_inquiries (sector_id, opportunity_id, investor_name, company_name, country_code,
                                       business_email, support_requested, consent_version, consented_at)
    VALUES (sector_a, opportunity_a, 'Synthetic investor', 'Synthetic company', 'VN',
            'investor@workflow.example', ARRAY['site_visit'], 'test-v1', now()) RETURNING inquiry_id INTO inquiry_a;
    PERFORM pg_temp.reject(format('UPDATE investment_inquiries SET sector_id = %L WHERE inquiry_id = %L', sector_b, inquiry_a),
        'investment_inquiries_opportunity_sector_fkey', 'Inquiry opportunity must match its sector');
    PERFORM pg_temp.reject(format('UPDATE investment_inquiries SET status = ''assigned'' WHERE inquiry_id = %L', inquiry_a),
        'investment_inquiries_assignment_check', 'Assignment requires a contact');
    PERFORM pg_temp.reject(format('UPDATE investment_inquiries SET consented_at = created_at + interval ''1 day'' WHERE inquiry_id = %L', inquiry_a),
        'investment_inquiries_consent_check', 'Consent must predate or coincide with submission');
    UPDATE investment_inquiries SET status = 'assigned', assigned_contact_id = contact_a WHERE inquiry_id = inquiry_a;
    PERFORM pg_temp.require(EXISTS (
        SELECT FROM investment_inquiries i
        JOIN investment_contacts c ON c.contact_id = i.assigned_contact_id
        JOIN opportunity_sectors os ON (os.opportunity_id, os.sector_id) = (i.opportunity_id, i.sector_id)
        JOIN investment_opportunities o ON o.opportunity_id = os.opportunity_id
        JOIN investor_profiles p ON p.opportunity_id = o.opportunity_id
        WHERE i.inquiry_id = inquiry_a AND p.investor_profile_id = profile_a
          AND c.contact_id = contact_a AND i.status = 'assigned' AND o.status = 'published'
    ), 'Published profile connects to its opportunity and assigned inquiry');
END;
$$;

ROLLBACK;
