"use client";

import { useCallback, useEffect, useState } from "react";
import { formalPlaceName } from "../../lib/i18n/data-labels";
import { useI18n } from "../../lib/i18n/provider";
import type { SectorId } from "./model";
import type { PublishedSurveyStudy } from "./survey-evidence-repository";

type ProvinceOption = { id: string; code: string; displayName: string };

export function SurveyAdminDashboard({
	provinces,
}: {
	provinces: ProvinceOption[];
}) {
	const { t, locale } = useI18n();
	const [token, setToken] = useState("");
	const [sessionActor, setSessionActor] = useState<string | null>(null);
	const [studies, setStudies] = useState<PublishedSurveyStudy[]>([]);
	const [statusMsg, setStatusMsg] = useState("");
	const [busy, setBusy] = useState(false);

	const [code, setCode] = useState("DEMO-RETAIL-2025");
	const [sector, setSector] = useState<SectorId>("retail");
	const [titleVi, setTitleVi] = useState(
		"Khảo sát mẫu nhu cầu tiêu dùng bán lẻ đa kênh 2025",
	);
	const [titleEn, setTitleEn] = useState(
		"Demo Omnichannel Retail Consumer Needs Study 2025",
	);
	const [segment, setSegment] = useState(
		"Hộ gia đình đô thị / Urban households",
	);
	const [method, setMethod] = useState("CATI phân tầng / Stratified CATI");
	const [sampleSize, setSampleSize] = useState("1200");
	const [periodStart, setPeriodStart] = useState("2025-01-01");
	const [periodEnd, setPeriodEnd] = useState("2025-06-30");
	const [periodLabel, setPeriodLabel] = useState("H1 2025");
	const [sourceName, setSourceName] = useState(
		"Viện Nghiên cứu Thị trường (DEMO)",
	);
	const [sourceUrl, setSourceUrl] = useState("https://nso.gov.vn/");
	const [isDemo, setIsDemo] = useState(true);
	const [questionCode, setQuestionCode] = useState("Q1_MODERN_TRADE_PREF");
	const promptVi =
		"Tỷ lệ ưu tiên kênh bán lẻ hiện đại & thương mại điện tử (%)";
	const promptEn = "Preference for modern trade and omnichannel retail (%)";
	const [selectedGeoIds, setSelectedGeoIds] = useState<string[]>(() =>
		provinces.slice(0, 2).map((p) => p.id),
	);

	const authHeaders = useCallback(() => {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (token.trim()) headers.authorization = `Bearer ${token.trim()}`;
		return headers;
	}, [token]);

	const loadStudies = useCallback(async () => {
		setBusy(true);
		try {
			const response = await fetch("/api/internal/surveys", {
				headers: authHeaders(),
			});
			const body = await response.json();
			if (!response.ok) {
				setStatusMsg(body.error ?? t("surveys.loadFailed"));
				return;
			}
			setStudies(body.data ?? []);
			setStatusMsg(
				t("surveys.loadedCount", { count: (body.data ?? []).length }),
			);
		} catch {
			setStatusMsg(t("surveys.loadFailed"));
		} finally {
			setBusy(false);
		}
	}, [authHeaders, t]);

	useEffect(() => {
		void fetch("/api/internal/session")
			.then((res) => res.json())
			.then((body) => {
				if (body.data?.authenticated && body.data?.role === "steward") {
					setSessionActor(body.data.actor);
				}
			})
			.catch(() => {});
	}, []);

	async function signInSession() {
		if (!token.trim()) return;
		setBusy(true);
		try {
			const res = await fetch("/api/internal/session", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token: token.trim() }),
			});
			const body = await res.json();
			if (res.ok && body.data?.role === "steward") {
				setSessionActor(body.data.actor);
				setToken("");
				setStatusMsg(t("admin.sessionSignedIn"));
				await loadStudies();
			} else {
				setStatusMsg(t("admin.sessionFailed"));
			}
		} finally {
			setBusy(false);
		}
	}

	async function createStudy() {
		if (selectedGeoIds.length === 0) return;
		setBusy(true);
		try {
			const n = Math.max(Number.parseInt(sampleSize, 10) || 100, 1);
			const perProvinceN = Math.max(Math.floor(n / selectedGeoIds.length), 1);
			const response = await fetch("/api/internal/surveys", {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					code: code.trim(),
					sector,
					titleVi: titleVi.trim(),
					titleEn: titleEn.trim(),
					segment: segment.trim(),
					method: method.trim(),
					sampleSize: n,
					periodStart,
					periodEnd,
					periodLabel: periodLabel.trim(),
					sourceName: sourceName.trim(),
					sourceUrl: sourceUrl.trim() || undefined,
					isDemo,
					publicationStatus: "published",
					questionCode: questionCode.trim(),
					promptVi: promptVi.trim(),
					promptEn: promptEn.trim(),
					aggregates: selectedGeoIds.map((geoId, idx) => ({
						geoId,
						sampleSize: perProvinceN,
						optionLabel: "Primary preference",
						valuePercent: Math.min(62 + idx * 6, 95),
					})),
				}),
			});
			const body = await response.json();
			if (!response.ok) {
				setStatusMsg(body.error ?? t("surveys.saveFailed"));
				return;
			}
			setStatusMsg(t("surveys.saved"));
			await loadStudies();
		} finally {
			setBusy(false);
		}
	}

	async function changeStatus(
		studyId: string,
		publicationStatus: "draft" | "published" | "retired",
	) {
		setBusy(true);
		try {
			const response = await fetch("/api/internal/surveys", {
				method: "PATCH",
				headers: authHeaders(),
				body: JSON.stringify({ studyId, publicationStatus }),
			});
			if (response.ok) {
				await loadStudies();
			}
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="decision-flow">
			<section aria-labelledby="survey-auth-title">
				<h2 id="survey-auth-title">{t("surveys.authTitle")}</h2>
				<div className="layer-filter-row">
					<label>
						{t("admin.token")}
						<input
							type="password"
							value={token}
							onChange={(event) => setToken(event.target.value)}
							placeholder="ECOM_ADMIN_TOKEN"
						/>
					</label>
					<div className="inquiry-report-actions">
						<button
							type="button"
							disabled={busy || !token.trim()}
							onClick={() => void signInSession()}
						>
							{t("admin.sessionSignIn")}
						</button>
						<button
							type="button"
							disabled={busy || (!token.trim() && !sessionActor)}
							onClick={() => void loadStudies()}
						>
							{t("surveys.loadButton")}
						</button>
					</div>
				</div>
				{sessionActor && (
					<p className="muted">
						{t("admin.sessionActive", { actor: sessionActor, role: "steward" })}
					</p>
				)}
				{statusMsg && <p role="status">{statusMsg}</p>}
			</section>

			<section aria-labelledby="survey-create-title">
				<h2 id="survey-create-title">{t("surveys.createTitle")}</h2>
				<div className="decision-filters">
					<label>
						{t("surveys.code")}
						<input
							value={code}
							onChange={(event) => setCode(event.target.value)}
						/>
					</label>
					<label>
						{t("retail.sector")}
						<select
							value={sector}
							onChange={(event) => setSector(event.target.value as SectorId)}
						>
							<option value="retail">{t("retail.retail")}</option>
							<option value="manufacturing">{t("retail.manufacturing")}</option>
							<option value="logistics">{t("retail.logistics")}</option>
							<option value="enterprise">{t("retail.enterprise")}</option>
						</select>
					</label>
					<label>
						{t("surveys.titleVi")}
						<input
							value={titleVi}
							onChange={(event) => setTitleVi(event.target.value)}
						/>
					</label>
					<label>
						{t("surveys.titleEn")}
						<input
							value={titleEn}
							onChange={(event) => setTitleEn(event.target.value)}
						/>
					</label>
					<label>
						{t("retail.evidenceSegment")}
						<input
							value={segment}
							onChange={(event) => setSegment(event.target.value)}
						/>
					</label>
					<label>
						{t("retail.evidenceMethod")}
						<input
							value={method}
							onChange={(event) => setMethod(event.target.value)}
						/>
					</label>
					<label>
						{t("retail.evidenceSample")}
						<input
							type="number"
							min="1"
							value={sampleSize}
							onChange={(event) => setSampleSize(event.target.value)}
						/>
					</label>
					<label>
						{t("retail.evidencePeriod")}
						<input
							value={periodLabel}
							onChange={(event) => setPeriodLabel(event.target.value)}
						/>
					</label>
					<label>
						{t("surveys.periodStart")}
						<input
							type="date"
							value={periodStart}
							onChange={(event) => setPeriodStart(event.target.value)}
						/>
					</label>
					<label>
						{t("surveys.periodEnd")}
						<input
							type="date"
							value={periodEnd}
							onChange={(event) => setPeriodEnd(event.target.value)}
						/>
					</label>
					<label>
						{t("retail.evidenceSourceInput")}
						<input
							value={sourceName}
							onChange={(event) => setSourceName(event.target.value)}
						/>
					</label>
					<label>
						{t("retail.evidenceSourceUrl")}
						<input
							type="url"
							value={sourceUrl}
							onChange={(event) => setSourceUrl(event.target.value)}
						/>
					</label>
					<label>
						{t("decision.questionId")}
						<input
							value={questionCode}
							onChange={(event) => setQuestionCode(event.target.value)}
						/>
					</label>
					<label>
						<input
							type="checkbox"
							checked={isDemo}
							onChange={(event) => setIsDemo(event.target.checked)}
						/>{" "}
						{t("surveys.isDemoLabel")}
					</label>
				</div>

				<fieldset className="province-choices">
					<legend>{t("surveys.coveredProvinces")}</legend>
					{provinces.slice(0, 12).map((prov) => (
						<label key={prov.id}>
							<input
								type="checkbox"
								checked={selectedGeoIds.includes(prov.id)}
								onChange={() =>
									setSelectedGeoIds((curr) =>
										curr.includes(prov.id)
											? curr.filter((id) => id !== prov.id)
											: [...curr, prov.id],
									)
								}
							/>{" "}
							{formalPlaceName(locale, prov)}
						</label>
					))}
				</fieldset>

				<div className="inquiry-report-actions">
					<button
						type="button"
						disabled={busy || selectedGeoIds.length === 0}
						onClick={() => void createStudy()}
					>
						{t("surveys.publishNew")}
					</button>
				</div>
			</section>

			<section aria-labelledby="survey-list-title">
				<h2 id="survey-list-title">{t("surveys.listTitle")}</h2>
				{studies.length === 0 ? (
					<p className="muted">{t("surveys.empty")}</p>
				) : (
					<ul className="legal-checklist">
						{studies.map((study) => (
							<li key={study.studyId} className="legal-checklist-item">
								<div className="legal-item-header">
									<span className="legal-item-title">
										{locale === "vi" ? study.title.vi : study.title.en} (
										{study.code})
									</span>
									<span
										className="legal-review-badge"
										data-status={
											study.publicationStatus === "published"
												? "verified_by_counsel"
												: "needs_specialist_review"
										}
									>
										{study.publicationStatus ?? "published"}
										{study.isDemo ? " · DEMO" : ""}
									</span>
								</div>
								<p className="legal-item-note">
									{study.sector} · {study.segment} · n={study.sampleSize} ·{" "}
									{study.periodLabel} ({study.periodStart} → {study.periodEnd})
									· {study.sourceName}
								</p>
								<div className="inquiry-report-actions">
									{study.publicationStatus !== "published" && (
										<button
											type="button"
											className="text-button"
											onClick={() =>
												void changeStatus(study.studyId, "published")
											}
										>
											{t("surveys.actionPublish")}
										</button>
									)}
									{study.publicationStatus !== "retired" && (
										<button
											type="button"
											className="text-button"
											onClick={() =>
												void changeStatus(study.studyId, "retired")
											}
										>
											{t("surveys.actionRetire")}
										</button>
									)}
								</div>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
