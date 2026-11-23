"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../geography/types";
import { compareProfiles } from "../geography/domain";
import { InquiryForm } from "../inquiries/InquiryForm";
import {
	calculateContextualRanking,
	calculateSectorScore,
	sectorScenarios,
	validateCustomerEvidence,
	type Evidence,
	type SectorId,
} from "./model";
import {
	defaultLegalChecklistBySector,
	type LegalChecklistBySector,
} from "./legal-readiness";
import { LegalReadinessChecklist } from "./LegalReadinessChecklist";
import { CapexOpexSimulator } from "./CapexOpexSimulator";
import {
	canonicalInvestmentIncentives,
	type InvestmentIncentiveItem,
} from "./investment-incentives";
import { InvestmentIncentivesPanel } from "./InvestmentIncentivesPanel";
import {
	canonicalInvestmentOpportunities,
	type InvestmentOpportunityItem,
} from "./investment-opportunities";
import { InvestmentOpportunitiesPanel } from "./InvestmentOpportunitiesPanel";
import { buildExecutiveBriefMarkdown } from "./executive-brief";
import {
	buildDecisionScenarioExport,
	decisionScenarioToCsv,
} from "./scenario-export";
import type { PublishedSurveyStudy } from "./survey-evidence-repository";
import { resolveIpaContactsForInquiry } from "../inquiries/ipa-directory";
import {
	infrastructureKindOrder,
	type InfrastructureKind,
} from "../map/layers";
import {
	canonicalInfrastructurePois,
	computeProximityForProvinces,
} from "../map/proximity";
import { useI18n } from "../../lib/i18n/provider";
import type { MessageKey } from "../../lib/i18n";
import {
	formalPlaceName,
	qualityLabel,
	unitLabel,
} from "../../lib/i18n/data-labels";

const SCENARIO_STORAGE_KEY = "ecom:decision-scenario:v1";

type EvidenceDraft = {
	segment: string;
	sampleSize: string;
	method: string;
	period: string;
	questionId: string;
	source: string;
	sourceUrl: string;
	coversSelected: boolean;
};

const emptyEvidenceDraft: EvidenceDraft = {
	segment: "",
	sampleSize: "",
	method: "",
	period: "",
	questionId: "",
	source: "",
	sourceUrl: "",
	coversSelected: false,
};

function toEvidence(draft: EvidenceDraft, selectedIds: string[]): Evidence {
	const sample = Number.parseInt(draft.sampleSize.trim(), 10);
	const candidate: Evidence = {
		status: "available",
		segment: draft.segment.trim() || undefined,
		sampleSize: Number.isFinite(sample) ? sample : undefined,
		method: draft.method.trim() || undefined,
		period: draft.period.trim() || undefined,
		questionId: draft.questionId.trim() || undefined,
		source: draft.source.trim() || undefined,
		sourceUrl: draft.sourceUrl.trim() || undefined,
		geographyIds: draft.coversSelected ? selectedIds : [],
	};
	const checked = validateCustomerEvidence(candidate, selectedIds);
	return checked.ok ? candidate : { ...candidate, status: "unavailable" };
}

function downloadScenarioFile(content: string, filename: string, mime: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function RetailScenario({
	provinces,
	legalChecklistBySector = defaultLegalChecklistBySector,
	surveyStudies = [],
	investmentIncentives = canonicalInvestmentIncentives,
	investmentOpportunities = canonicalInvestmentOpportunities,
}: {
	provinces: Profile[];
	legalChecklistBySector?: LegalChecklistBySector;
	surveyStudies?: PublishedSurveyStudy[];
	investmentIncentives?: readonly InvestmentIncentiveItem[];
	investmentOpportunities?: readonly InvestmentOpportunityItem[];
}) {
	const { t, tc, locale, formatNumber } = useI18n();
	const [sector, setSector] = useState<"" | SectorId>("");
	const [targetSegment, setTargetSegment] = useState("");
	const [hypotheses, setHypotheses] = useState("");
	const [minimums, setMinimums] = useState<string[]>(["", ""]);
	const [proximityKind, setProximityKind] = useState<"" | InfrastructureKind>(
		"",
	);
	const [proximityKm, setProximityKm] = useState("100");
	const [selected, setSelected] = useState<string[]>([]);
	const [weights, setWeights] = useState<string[]>(["60", "40"]);
	const [showResult, setShowResult] = useState(false);
	const [showWhatIf, setShowWhatIf] = useState(false);
	const [setChangedNotice, setSetChangedNotice] = useState(false);
	const [benchmarkId, setBenchmarkId] = useState("");
	const [evidenceDraft, setEvidenceDraft] =
		useState<EvidenceDraft>(emptyEvidenceDraft);
	const [scenarioExportStatus, setScenarioExportStatus] = useState("");
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const validIds = new Set(provinces.map((profile) => profile.id));
		try {
			const savedRaw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
			if (savedRaw) {
				const saved = JSON.parse(savedRaw) as {
					sector?: "" | SectorId;
					targetSegment?: string;
					hypotheses?: string;
					minimums?: string[];
					selected?: string[];
					weights?: string[];
					evidenceDraft?: Partial<EvidenceDraft>;
				};
				if (saved.sector && saved.sector in sectorScenarios) {
					const preset = sectorScenarios[saved.sector];
					setSector(saved.sector);
					setMinimums(
						Array.isArray(saved.minimums) &&
							saved.minimums.length === preset.criteria.length
							? saved.minimums
							: preset.criteria.map(() => ""),
					);
					setWeights(
						Array.isArray(saved.weights) &&
							saved.weights.length === preset.criteria.length
							? saved.weights
							: [...preset.defaultWeights],
					);
				}
				if (typeof saved.targetSegment === "string")
					setTargetSegment(saved.targetSegment);
				if (typeof saved.hypotheses === "string")
					setHypotheses(saved.hypotheses);
				if (Array.isArray(saved.selected)) {
					setSelected(
						saved.selected.filter((id) => validIds.has(id)).slice(0, 3),
					);
				}
				if (saved.evidenceDraft && typeof saved.evidenceDraft === "object") {
					setEvidenceDraft({ ...emptyEvidenceDraft, ...saved.evidenceDraft });
				}
			}
		} catch {
			// Ignore malformed browser storage
		}
		const params = new URLSearchParams(window.location.search);
		const fromQuery = (params.get("provinces") ?? "")
			.split(",")
			.map((id) => id.trim())
			.filter((id) => validIds.has(id))
			.slice(0, 3);
		if (fromQuery.length > 0) {
			setSelected(fromQuery);
		}
		setHydrated(true);
	}, [provinces]);

	useEffect(() => {
		if (!hydrated) return;
		try {
			window.localStorage.setItem(
				SCENARIO_STORAGE_KEY,
				JSON.stringify({
					sector,
					targetSegment,
					hypotheses,
					minimums,
					selected,
					weights,
					evidenceDraft,
				}),
			);
		} catch {
			// Storage may be unavailable in private browsing
		}
	}, [
		hydrated,
		sector,
		targetSegment,
		hypotheses,
		minimums,
		selected,
		weights,
		evidenceDraft,
	]);

	const activeScenario = sector ? sectorScenarios[sector] : null;
	const activeCriteria = activeScenario?.criteria ?? [];

	function handleSectorChange(value: "" | SectorId) {
		setSector(value);
		setSelected([]);
		setBenchmarkId("");
		setShowResult(false);
		setShowWhatIf(false);
		setSetChangedNotice(false);
		setScenarioExportStatus("");
		if (value) {
			const next = sectorScenarios[value];
			setMinimums(next.criteria.map(() => ""));
			setWeights([...next.defaultWeights]);
		} else {
			setMinimums([]);
			setWeights([]);
		}
	}

	function resetScenario() {
		setSector("");
		setTargetSegment("");
		setHypotheses("");
		setMinimums(["", ""]);
		setSelected([]);
		setWeights(["60", "40"]);
		setShowResult(false);
		setShowWhatIf(false);
		setSetChangedNotice(false);
		setBenchmarkId("");
		setEvidenceDraft(emptyEvidenceDraft);
		setScenarioExportStatus("");
		try {
			window.localStorage.removeItem(SCENARIO_STORAGE_KEY);
		} catch {
			// Ignore storage errors
		}
	}

	const thresholds = activeCriteria.map((_, index) => {
		const raw = minimums[index] ?? "";
		return raw.trim() === "" ? null : Number(raw);
	});
	const proximityMaxKm =
		proximityKind && proximityKm.trim() !== "" ? Number(proximityKm) : null;
	const invalid =
		thresholds.some(
			(value) => value !== null && (!Number.isFinite(value) || value < 0),
		) ||
		(proximityMaxKm !== null &&
			(!Number.isFinite(proximityMaxKm) ||
				proximityMaxKm < 1 ||
				proximityMaxKm > 1500));
	const proximityEval =
		proximityKind &&
		proximityMaxKm !== null &&
		Number.isFinite(proximityMaxKm) &&
		proximityMaxKm >= 1
			? computeProximityForProvinces(
					provinces,
					canonicalInfrastructurePois,
					proximityKind,
					proximityMaxKm,
				)
			: null;
	const proximityAllowedSet = proximityEval
		? new Set(proximityEval.matchedProvinceIds)
		: null;
	const candidates = provinces.filter(
		(profile) =>
			(!proximityAllowedSet || proximityAllowedSet.has(profile.id)) &&
			activeCriteria.every((criterion, index) => {
				const threshold = thresholds[index];
				if (threshold === null) return true;
				const item = profile.observations.find(
					(row) => row.indicator === criterion.code,
				);
				return (
					item &&
					item.quality !== "unavailable" &&
					item.value !== null &&
					item.value >= threshold
				);
			}),
	);
	const chosen = candidates.filter((profile) => selected.includes(profile.id));
	const comparison = chosen.length >= 2 ? compareProfiles(chosen) : null;
	const benchmarkIndex = chosen.findIndex(
		(profile) => profile.id === benchmarkId,
	);
	const excluded = provinces.filter((profile) => !candidates.includes(profile));
	const numericWeights = weights.map((weight) =>
		weight.trim() === "" ? Number.NaN : Number(weight),
	);
	const chosenIds = chosen.map((profile) => profile.id);
	const matchingStudies = sector
		? surveyStudies.filter(
				(study) =>
					study.sector === sector &&
					(chosenIds.length === 0 ||
						chosenIds.every((id) => study.coveredGeoIds.includes(id))),
			)
		: [];
	const publishedEvidence: Evidence | null =
		matchingStudies.length > 0 && chosenIds.length > 0
			? {
					status: "available",
					segment: matchingStudies[0].segment,
					geographyIds: matchingStudies[0].coveredGeoIds,
					sampleSize: matchingStudies[0].sampleSize,
					method: matchingStudies[0].method,
					period: `${matchingStudies[0].periodLabel} (${matchingStudies[0].periodStart} → ${matchingStudies[0].periodEnd})`,
					periodStart: matchingStudies[0].periodStart,
					periodEnd: matchingStudies[0].periodEnd,
					questionId: matchingStudies[0].questions[0]?.questionCode,
					source: matchingStudies[0].sourceName,
					sourceUrl: matchingStudies[0].sourceUrl ?? undefined,
					isDemo: matchingStudies[0].isDemo,
				}
			: null;
	const draftEvidence = toEvidence(evidenceDraft, chosenIds);
	const evidence =
		draftEvidence.status === "available"
			? draftEvidence
			: (publishedEvidence ?? draftEvidence);
	const evidenceValidation = validateCustomerEvidence(
		{ ...draftEvidence, status: "available" },
		chosenIds,
	);
	const result = calculateSectorScore(
		activeCriteria,
		chosen,
		numericWeights,
		evidence,
	);
	const whatIfResult = showWhatIf
		? calculateContextualRanking(activeCriteria, chosen, numericWeights)
		: null;

	function toggle(id: string) {
		if (showResult || showWhatIf) setSetChangedNotice(true);
		setSelected((current) =>
			current.includes(id)
				? current.filter((value) => value !== id)
				: current.length < 3
					? [...current, id]
					: current,
		);
		setShowResult(false);
		setShowWhatIf(false);
	}

	function exportScenario(format: "json" | "csv") {
		if (!activeScenario || !sector) return;
		const payload = buildDecisionScenarioExport({
			sector,
			sectorLabel: t(activeScenario.labelKey),
			criteria: activeCriteria,
			weights: numericWeights,
			profiles: chosen,
			targetSegment,
			hypotheses,
			evidence,
			officialResult: result,
			whatIfResult,
		});
		const stamp = payload.exportedAt.slice(0, 10);
		if (format === "json") {
			downloadScenarioFile(
				`${JSON.stringify(payload, null, 2)}\n`,
				`decision-scenario-${sector}-${stamp}.json`,
				"application/json;charset=utf-8",
			);
		} else {
			downloadScenarioFile(
				decisionScenarioToCsv(payload),
				`decision-scenario-${sector}-${stamp}.csv`,
				"text/csv;charset=utf-8",
			);
		}
		setScenarioExportStatus(
			t("decision.scenarioExported", { format: format.toUpperCase() }),
		);
	}

	function exportExecutiveBrief() {
		if (!activeScenario || !sector || chosen.length === 0) return;
		const md = buildExecutiveBriefMarkdown({
			locale,
			sector,
			sectorLabel: t(activeScenario.labelKey),
			targetSegment,
			hypotheses,
			criteria: activeCriteria,
			weights: numericWeights,
			profiles: chosen,
			evidence,
			officialResult: result,
			whatIfResult,
			incentives: investmentIncentives,
			opportunities: investmentOpportunities,
			legalChecklist: legalChecklistBySector[sector] ?? [],
		});
		const stamp = new Date().toISOString().slice(0, 10);
		downloadScenarioFile(
			md,
			`executive-location-brief-${sector}-${stamp}.md`,
			"text/markdown;charset=utf-8",
		);
		setScenarioExportStatus(t("brief.exported"));
	}

	return (
		<div className="decision-flow">
			{activeScenario && (
				<nav aria-label={t("retail.stepsAria")} className="decision-steps">
					<a href="#sector-title">{t("retail.sector")}</a>
					<a href="#filters-title">{t("retail.stepFilter")}</a>
					{chosen.length > 0 && (
						<a href="#compare-title">{t("retail.stepCompare")}</a>
					)}
					<a href="#evidence-title">{t("retail.stepEvidence")}</a>
					{chosen.length > 0 && (
						<a href="#contact-title">{t("retail.stepContact")}</a>
					)}
				</nav>
			)}
			<section aria-labelledby="sector-title">
				<h2 id="sector-title">{t("retail.sectorTitle")}</h2>
				<div className="decision-filters">
					<label>
						{t("retail.sector")}
						<select
							value={sector}
							onChange={(event) =>
								handleSectorChange(event.target.value as "" | SectorId)
							}
						>
							<option value="">{t("retail.selectSector")}</option>
							<option value="retail">{t("retail.retail")}</option>
							<option value="manufacturing">{t("retail.manufacturing")}</option>
							<option value="logistics">{t("retail.logistics")}</option>
							<option value="enterprise">{t("retail.enterprise")}</option>
						</select>
					</label>
					<label>
						{t("decision.targetSegment")}
						<input
							type="text"
							maxLength={160}
							value={targetSegment}
							placeholder={t("decision.targetSegmentPlaceholder")}
							onChange={(event) => setTargetSegment(event.target.value)}
						/>
					</label>
				</div>
				<label className="decision-hypotheses">
					<span>{t("decision.hypotheses")}</span>
					<textarea
						rows={2}
						maxLength={600}
						value={hypotheses}
						placeholder={t("decision.hypothesesPlaceholder")}
						onChange={(event) => setHypotheses(event.target.value)}
					/>
				</label>
				{(sector || targetSegment || hypotheses || selected.length > 0) && (
					<div className="inquiry-report-actions">
						<button
							type="button"
							className="text-button"
							onClick={resetScenario}
						>
							{t("decision.resetScenario")}
						</button>
					</div>
				)}
			</section>
			{activeScenario && (
				<>
					<section aria-labelledby="filters-title">
						<h2 id="filters-title">{t("retail.filterTitle")}</h2>
						<p>{t("retail.filterNote")}</p>
						<div className="decision-filters">
							{activeCriteria.map((criterion, index) => (
								<label key={criterion.code}>
									{criterion.minimumLabelKey
										? t(criterion.minimumLabelKey)
										: t("retail.minimumCriterion", {
												label: t(criterion.labelKey),
												unit: unitLabel(locale, criterion.unit),
											})}
									<input
										type="number"
										min="0"
										value={minimums[index] ?? ""}
										onChange={(event) => {
											const nextValue = event.target.value;
											setMinimums((current) =>
												current.map((val, i) =>
													i === index ? nextValue : val,
												),
											);
											setSelected([]);
											setShowResult(false);
											setShowWhatIf(false);
										}}
									/>
								</label>
							))}
							<label>
								{t("proximity.kindLabel")}
								<select
									value={proximityKind}
									onChange={(event) => {
										setProximityKind(
											event.target.value as "" | InfrastructureKind,
										);
										setSelected([]);
										setShowResult(false);
										setShowWhatIf(false);
									}}
								>
									<option value="">{t("proximity.none")}</option>
									{infrastructureKindOrder.map((kind) => (
										<option key={kind} value={kind}>
											{t(`infra.${kind}` as MessageKey)}
										</option>
									))}
								</select>
							</label>
							{proximityKind && (
								<label>
									{t("proximity.radiusKm")}
									<input
										type="number"
										min="1"
										max="1500"
										value={proximityKm}
										onChange={(event) => {
											setProximityKm(event.target.value);
											setSelected([]);
											setShowResult(false);
											setShowWhatIf(false);
										}}
									/>
								</label>
							)}
						</div>
						{proximityKind && proximityEval && (
							<p className="muted" role="status">
								{t("proximity.summary", {
									matched: proximityEval.matchedCount,
									total: proximityEval.totalProvinces,
									km: proximityKm,
									kind: t(`infra.${proximityKind}` as MessageKey),
								})}
							</p>
						)}
						<p>{t("retail.missingExcluded")}</p>
						{invalid ? (
							<p role="alert">{t("retail.invalid")}</p>
						) : (
							<p role="status">
								{t("retail.matchCount", { count: candidates.length })}
							</p>
						)}
						{!invalid && excluded.length > 0 && (
							<details>
								<summary>
									{t("retail.excludedTitle", { count: excluded.length })}
								</summary>
								<ul>
									{excluded.map((profile) => (
										<li key={profile.id}>
											<strong>{profile.displayName}:</strong>{" "}
											{activeCriteria
												.flatMap((criterion, index) => {
													const minimum = thresholds[index];
													if (minimum === null) return [];
													const item = profile.observations.find(
														(row) => row.indicator === criterion.code,
													);
													const label = t(criterion.labelKey);
													return !item ||
														item.value === null ||
														item.quality === "unavailable"
														? [t("retail.excludedMissing", { label })]
														: item.value < minimum
															? [
																	t("retail.excludedBelow", {
																		label,
																		value: formatNumber(item.value),
																		unit: unitLabel(locale, item.unit),
																		minimum: formatNumber(minimum),
																	}),
																]
															: [];
												})
												.join("; ")}
										</li>
									))}
								</ul>
							</details>
						)}
						{!invalid && (
							<fieldset className="decision-places">
								<legend>{t("retail.provinces")}</legend>
								{candidates.map((profile) => (
									<label key={profile.id}>
										<input
											type="checkbox"
											checked={selected.includes(profile.id)}
											disabled={
												selected.length >= 3 && !selected.includes(profile.id)
											}
											onChange={() => toggle(profile.id)}
										/>
										{formalPlaceName(locale, profile)}
									</label>
								))}
							</fieldset>
						)}
					</section>
					{chosen.length > 0 && (
						<section aria-labelledby="compare-title">
							<h2 id="compare-title">{t("retail.compareTitle")}</h2>
							{chosen.length >= 2 && (
								<label>
									{t("retail.baseline")}
									<select
										value={benchmarkIndex >= 0 ? benchmarkId : ""}
										onChange={(event) => setBenchmarkId(event.target.value)}
									>
										<option value="">{t("retail.baselinePlaceholder")}</option>
										{chosen.map((profile) => (
											<option key={profile.id} value={profile.id}>
												{formalPlaceName(locale, profile)}
											</option>
										))}
									</select>
								</label>
							)}
							<p>{t("retail.differencesNote")}</p>
							<div className="decision-table-wrap">
								<table>
									<thead>
										<tr>
											<th scope="col">{t("retail.indicatorCol")}</th>
											{chosen.map((profile) => (
												<th scope="col" key={profile.id}>
													{formalPlaceName(locale, profile)}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{activeCriteria.map((criterion) => (
											<tr key={criterion.code}>
												<th scope="row">
													{t(criterion.labelKey)}
													{comparison?.rows.find(
														(row) => row.indicator === criterion.code,
													)?.reason && (
														<small className="decision-mismatch">
															{tc(
																comparison.rows.find(
																	(row) => row.indicator === criterion.code,
																)?.reasonCode,
																comparison.rows.find(
																	(row) => row.indicator === criterion.code,
																)?.reason,
															)}
														</small>
													)}
												</th>
												{chosen.map((profile, profileIndex) => {
													const item = profile.observations.find(
														(observation) =>
															observation.indicator === criterion.code,
													);
													const matches =
														comparison?.rows.find(
															(row) => row.indicator === criterion.code,
														)?.metadataMatches ?? true;
													const baseline =
														benchmarkIndex >= 0
															? comparison?.rows.find(
																	(row) => row.indicator === criterion.code,
																)?.values[benchmarkIndex]
															: null;
													const value = comparison?.rows.find(
														(row) => row.indicator === criterion.code,
													)?.values[profileIndex];
													return (
														<td key={profile.id}>
															{!matches ? (
																<span>{t("retail.notComparable")}</span>
															) : !item ||
																item.value === null ||
																item.quality === "unavailable" ? (
																<span>
																	{t("common.unavailable")}
																	{item?.missingReason
																		? ` · ${item.missingReason}`
																		: ""}
																</span>
															) : (
																<>
																	<strong>
																		{formatNumber(item.value)}{" "}
																		{unitLabel(locale, item.unit)}
																	</strong>
																	<br />
																	{item.period} ·{" "}
																	{qualityLabel(locale, item.quality)}
																	<br />
																	{item.source.url ? (
																		<a href={item.source.url}>
																			{item.source.publisher}
																		</a>
																	) : (
																		item.source.publisher
																	)}
																	<br />
																	{item.datasetVersion} · {item.source.license}
																	{benchmarkIndex >= 0 &&
																		profileIndex !== benchmarkIndex &&
																		baseline != null &&
																		value != null && (
																			<>
																				<br />
																				<small>
																					{t("retail.difference", {
																						name: chosen[benchmarkIndex]
																							.displayName,
																						delta: formatNumber(
																							value - baseline,
																						),
																						unit: unitLabel(locale, item.unit),
																					})}
																					{baseline !== 0
																						? t("retail.percentage", {
																								percent: formatNumber(
																									((value - baseline) /
																										baseline) *
																										100,
																								),
																							})
																						: t("retail.percentageUnavailable")}
																				</small>
																			</>
																		)}
																</>
															)}
														</td>
													);
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					)}
					<section aria-labelledby="evidence-title">
						<h2 id="evidence-title">{t("retail.evidenceTitle")}</h2>
						<p>
							{t("retail.evidenceContext")}{" "}
							<a href="https://www.nso.gov.vn/tin-tuc-thong-ke/2026/07/thong-cao-bao-chi-ket-qua-khao-sat-muc-song-dan-cu-2025/">
								{t("retail.evidenceSource")}
							</a>
						</p>
						<p role="status">
							{evidence.status === "available"
								? t("decision.evidenceMetaSummary", {
										segment: evidence.segment ?? "",
										sample: formatNumber(evidence.sampleSize ?? 0),
										method: evidence.method ?? "",
										period: evidence.period ?? "",
										source: evidence.source ?? "",
									})
								: t("retail.evidenceNone")}
						</p>
						{matchingStudies.length > 0 && (
							<div className="published-studies">
								<h3>{t("decision.publishedStudiesTitle")}</h3>
								<ul>
									{matchingStudies.map((study) => (
										<li key={study.studyId}>
											<strong>
												{locale === "vi" ? study.title.vi : study.title.en}
											</strong>{" "}
											{study.isDemo && (
												<span className="demo-badge">
													{t("decision.demoBadge")}
												</span>
											)}
											<p className="muted">
												{t("decision.evidenceMetaSummary", {
													segment: study.segment,
													sample: formatNumber(study.sampleSize),
													method: study.method,
													period: `${study.periodLabel} (${study.periodStart} → ${study.periodEnd})`,
													source: study.sourceName,
												})}
												{study.questions.length > 0
													? ` · ${study.questions.map((q) => q.questionCode).join(", ")}`
													: ""}
											</p>
										</li>
									))}
								</ul>
							</div>
						)}
						<p>{t("retail.evidenceRequirement")}</p>
						<details>
							<summary>{t("retail.evidenceProvide")}</summary>
							<div className="decision-filters">
								<label>
									{t("retail.evidenceSegment")}
									<input
										value={evidenceDraft.segment}
										maxLength={160}
										onChange={(event) => {
											setEvidenceDraft((prev) => ({
												...prev,
												segment: event.target.value,
											}));
											setShowResult(false);
										}}
									/>
								</label>
								<label>
									{t("retail.evidenceSample")}
									<input
										type="number"
										min="1"
										value={evidenceDraft.sampleSize}
										onChange={(event) => {
											setEvidenceDraft((prev) => ({
												...prev,
												sampleSize: event.target.value,
											}));
											setShowResult(false);
										}}
									/>
								</label>
								<label>
									{t("retail.evidenceMethod")}
									<input
										value={evidenceDraft.method}
										maxLength={200}
										onChange={(event) => {
											setEvidenceDraft((prev) => ({
												...prev,
												method: event.target.value,
											}));
											setShowResult(false);
										}}
									/>
								</label>
								<label>
									{t("retail.evidencePeriod")}
									<input
										value={evidenceDraft.period}
										maxLength={80}
										onChange={(event) => {
											setEvidenceDraft((prev) => ({
												...prev,
												period: event.target.value,
											}));
											setShowResult(false);
										}}
									/>
								</label>
								<label>
									{t("decision.questionId")}
									<input
										value={evidenceDraft.questionId}
										maxLength={60}
										onChange={(event) => {
											setEvidenceDraft((prev) => ({
												...prev,
												questionId: event.target.value,
											}));
											setShowResult(false);
										}}
									/>
								</label>
								<label>
									{t("retail.evidenceSourceInput")}
									<input
										value={evidenceDraft.source}
										maxLength={240}
										onChange={(event) => {
											setEvidenceDraft((prev) => ({
												...prev,
												source: event.target.value,
											}));
											setShowResult(false);
										}}
									/>
								</label>
								<label>
									{t("retail.evidenceSourceUrl")}
									<input
										type="url"
										value={evidenceDraft.sourceUrl}
										maxLength={300}
										placeholder="https://..."
										onChange={(event) => {
											setEvidenceDraft((prev) => ({
												...prev,
												sourceUrl: event.target.value,
											}));
											setShowResult(false);
										}}
									/>
								</label>
							</div>
							{!evidenceValidation.checks.sourceUrlValid && (
								<p role="alert">{t("retail.evidenceUrlInvalid")}</p>
							)}
							<label>
								<input
									type="checkbox"
									checked={evidenceDraft.coversSelected}
									onChange={(event) => {
										setEvidenceDraft((prev) => ({
											...prev,
											coversSelected: event.target.checked,
										}));
										setShowResult(false);
									}}
								/>{" "}
								{t("retail.evidenceCoversSelected")}
							</label>
							<p className="muted">
								<strong>{t("retail.evidenceChecklist")}:</strong>
							</p>
							<ul className="evidence-checklist">
								<li data-ready={evidenceValidation.checks.segment}>
									{t("retail.evidenceSegment")}:{" "}
									{t(
										evidenceValidation.checks.segment
											? "retail.checkReady"
											: "retail.checkMissing",
									)}
								</li>
								<li data-ready={evidenceValidation.checks.sampleSize}>
									{t("retail.evidenceSample")}:{" "}
									{t(
										evidenceValidation.checks.sampleSize
											? "retail.checkReady"
											: "retail.checkMissing",
									)}
								</li>
								<li data-ready={evidenceValidation.checks.method}>
									{t("retail.evidenceMethod")}:{" "}
									{t(
										evidenceValidation.checks.method
											? "retail.checkReady"
											: "retail.checkMissing",
									)}
								</li>
								<li data-ready={evidenceValidation.checks.period}>
									{t("retail.evidencePeriod")}:{" "}
									{t(
										evidenceValidation.checks.period
											? "retail.checkReady"
											: "retail.checkMissing",
									)}
								</li>
								<li data-ready={evidenceValidation.checks.source}>
									{t("retail.evidenceSourceInput")}:{" "}
									{t(
										evidenceValidation.checks.source
											? "retail.checkReady"
											: "retail.checkMissing",
									)}
								</li>
								<li data-ready={evidenceValidation.checks.coverage}>
									{t("retail.evidenceCoversSelected")}:{" "}
									{t(
										evidenceValidation.checks.coverage
											? "retail.checkReady"
											: "retail.checkMissing",
									)}
								</li>
							</ul>
							{evidence.status === "available" && (
								<p>
									<button
										type="button"
										className="text-button"
										onClick={() => {
											setEvidenceDraft(emptyEvidenceDraft);
											setShowResult(false);
										}}
									>
										{t("retail.evidenceClear")}
									</button>
								</p>
							)}
						</details>
					</section>
					<section aria-labelledby="score-title">
						<h2 id="score-title">{t("retail.scoreTitle")}</h2>
						<p>{t("retail.scoreNote")}</p>
						<div className="decision-filters">
							{activeCriteria.map((criterion, index) => (
								<label key={criterion.code}>
									{t("retail.weight", { label: t(criterion.labelKey) })}
									<input
										type="number"
										min="0"
										max="100"
										value={weights[index] ?? ""}
										onChange={(event) => {
											setWeights((current) =>
												current.map((value, i) =>
													i === index ? event.target.value : value,
												),
											);
											setShowResult(false);
											setShowWhatIf(false);
										}}
									/>
								</label>
							))}
						</div>
						<div className="inquiry-report-actions">
							<button
								type="button"
								onClick={() => {
									setShowResult(true);
									setSetChangedNotice(false);
								}}
							>
								{t("retail.assess")}
							</button>
							<button
								type="button"
								className="text-button"
								onClick={() => {
									setShowWhatIf((value) => !value);
									setSetChangedNotice(false);
								}}
							>
								{t("retail.whatIfAction")}
							</button>
							{chosen.length >= 2 && (
								<>
									<button
										type="button"
										className="text-button"
										onClick={() => exportScenario("json")}
									>
										{t("decision.exportScenarioJson")}
									</button>
									<button
										type="button"
										className="text-button"
										onClick={() => exportScenario("csv")}
									>
										{t("decision.exportScenarioCsv")}
									</button>
									<button
										type="button"
										className="text-button"
										onClick={exportExecutiveBrief}
									>
										{t("brief.exportMarkdown")}
									</button>
									<button
										type="button"
										className="text-button"
										onClick={() => window.print()}
									>
										{t("brief.printA4")}
									</button>
								</>
							)}
						</div>
						{scenarioExportStatus && (
							<p role="status" className="muted">
								{scenarioExportStatus}
							</p>
						)}
						{setChangedNotice && (
							<p role="alert" className="whatif-warning">
								{t("decision.sensitivityWarning")}
							</p>
						)}
						{showResult && (
							<div role="status" className="decision-result">
								{!result.ok ? (
									<>
										<strong>{t("retail.assessUnavailable")}</strong>
										<ul>
											{result.reasons.map((reason, index) => (
												<li key={`${reason.code}-${index}`}>
													{t(
														reason.code,
														"criterion" in reason
															? { label: t(reason.criterion) }
															: undefined,
													)}
												</li>
											))}
										</ul>
									</>
								) : (
									<>
										<p>{t("retail.scoreRelative")}</p>
										<p className="whatif-warning">
											{t("decision.sensitivityWarning")}
										</p>
										{result.results.map((item) => (
											<article key={item.id}>
												<h3>
													{t("retail.scoreHeading", {
														name: item.name,
														score: formatNumber(item.score),
													})}
												</h3>
												<ul>
													{item.parts.map((part) => (
														<li key={part.label}>
															{t("retail.partLine", {
																label: t(part.labelKey),
																value: formatNumber(part.value),
																normalized: formatNumber(part.normalized),
																weight: formatNumber(part.weight),
																contribution: formatNumber(part.contribution),
															})}
														</li>
													))}
												</ul>
											</article>
										))}
									</>
								)}
							</div>
						)}
						{whatIfResult && (
							<div
								role="region"
								aria-label={t("retail.whatIfHeading")}
								className="whatif-result"
							>
								<strong>{t("retail.whatIfHeading")}</strong>
								<p className="whatif-warning">{t("retail.whatIfDisclaimer")}</p>
								{!whatIfResult.ok ? (
									<ul>
										{whatIfResult.reasons.map((reason, index) => (
											<li key={`${reason.code}-${index}`}>
												{t(
													reason.code,
													"criterion" in reason
														? { label: t(reason.criterion) }
														: undefined,
												)}
											</li>
										))}
									</ul>
								) : (
									<>
										{whatIfResult.ineligibleIndicators.length > 0 && (
											<p className="muted">
												{t("retail.whatIfIneligible", {
													labels: whatIfResult.ineligibleIndicators
														.map((key) => t(key))
														.join(", "),
												})}
											</p>
										)}
										<p>{t("retail.scoreRelative")}</p>
										{whatIfResult.results.map((item) => (
											<article key={item.id}>
												<h3>
													{t("retail.scoreHeading", {
														name: item.name,
														score: formatNumber(Number(item.score.toFixed(1))),
													})}
												</h3>
												<ul>
													{item.parts.map((part) => (
														<li key={part.label}>
															{t("retail.partLine", {
																label: t(part.labelKey),
																value: formatNumber(part.value),
																normalized: formatNumber(
																	Number(part.normalized.toFixed(1)),
																),
																weight: formatNumber(part.weight),
																contribution: formatNumber(
																	Number(part.contribution.toFixed(1)),
																),
															})}
														</li>
													))}
												</ul>
											</article>
										))}
									</>
								)}
							</div>
						)}
					</section>
					{chosen.length > 0 && (
						<section aria-labelledby="contact-title">
							<h2 id="contact-title">{t("retail.contactTitle")}</h2>
							<p>{t("retail.contactBody")}</p>
							<div className="ipa-routing-box">
								<h3>{t("ipa.title")}</h3>
								<p className="muted">{t("ipa.note")}</p>
								<ul>
									{resolveIpaContactsForInquiry({
										provinceCodes: chosen.map((profile) => profile.code),
										provinceNames: chosen.map((profile) => profile.displayName),
										sector: sector || undefined,
									}).map((contact) => (
										<li key={contact.code}>
											<strong>{contact.organization[locale]}</strong> (
											{contact.department[locale]}) ·{" "}
											<a
												href={contact.officialUrl}
												target="_blank"
												rel="noreferrer"
											>
												{contact.publicEmail}
											</a>
										</li>
									))}
								</ul>
							</div>
							<InquiryForm
								key={`${sector}-${chosen.map((profile) => profile.id).join(",")}`}
								geographyIds={chosen.map((profile) => profile.id)}
								geographyLabels={chosen.map((profile) => profile.displayName)}
								defaultSector={t(activeScenario.labelKey)}
							/>
						</section>
					)}
					{sector && (
						<>
							<InvestmentOpportunitiesPanel
								sector={sector}
								provinceCodes={chosen.map((profile) => profile.code)}
								opportunities={investmentOpportunities}
							/>
							{chosen.length >= 2 && chosen.length <= 3 && (
								<CapexOpexSimulator
									key={sector}
									provinces={chosen}
									sector={sector}
									incentives={investmentIncentives}
								/>
							)}
							<InvestmentIncentivesPanel
								sector={sector}
								selectedProvinces={chosen.map((profile) => ({
									id: profile.id,
									code: profile.code,
									displayName: profile.displayName,
								}))}
								incentives={investmentIncentives}
							/>
							<LegalReadinessChecklist
								sector={sector}
								sectorLabel={t(activeScenario.labelKey)}
								items={legalChecklistBySector[sector] ?? []}
								selectedProvinces={chosen.map((profile) => ({
									id: profile.id,
									name: profile.displayName,
								}))}
							/>
						</>
					)}
				</>
			)}
		</div>
	);
}
