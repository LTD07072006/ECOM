"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import styles from "./investor-guide.module.css";
import {
	estimateTimelineSummary,
	getRoadmapForTrack,
	isValidProjectTrack,
	PROJECT_TRACK_OPTIONS,
	type ProjectTrack,
	sanitizeCompletedByTrack,
} from "./licensing-roadmap";

const STORAGE_KEY = "tmdt.fdiRoadmap.v1";

type PersistedState = {
	track: ProjectTrack;
	completedByTrack: Partial<Record<ProjectTrack, string[]>>;
};

const COPY = {
	vi: {
		heading: "Lộ trình cấp phép FDI & Danh mục hồ sơ tương tác",
		subtitle:
			"Chọn mô hình dự án để xem thứ tự thủ tục, cơ quan tiếp nhận và thời gian xử lý luật định theo ngày làm việc.",
		print: "In checklist",
		reset: "Đặt lại tiến độ",
		trackSelectorAria: "Chọn loại hình dự án đầu tư",
		totalSteps: "Số bước áp dụng",
		completion: "Tiến độ chuẩn bị",
		statutoryTotal: "Tổng thời gian luật định",
		remainingDays: "Thời gian còn lại dự kiến",
		workingDaysUnit: "ngày làm việc",
		authorityLabel: "Cơ quan giải quyết:",
		docsSummary: "Hồ sơ cốt lõi cần chuẩn bị",
		legalLabel: "Căn cứ pháp lý:",
		disclaimer:
			"Lưu ý: Thời gian nêu trên là thời hạn thẩm định theo luật định kể từ ngày nhận đủ hồ sơ hợp lệ; không bao gồm thời gian hoàn thiện/bổ sung hồ sơ hoặc giải phóng mặt bằng thực tế.",
		stepPrefix: "Bước",
	},
	en: {
		heading: "Interactive FDI Licensing Roadmap & Document Checklist",
		subtitle:
			"Select your investment track to review procedural order, competent authorities, and statutory working-day SLAs.",
		print: "Print checklist",
		reset: "Reset progress",
		trackSelectorAria: "Select investment project track",
		totalSteps: "Applicable steps",
		completion: "Readiness progress",
		statutoryTotal: "Statutory duration",
		remainingDays: "Remaining estimated SLA",
		workingDaysUnit: "working days",
		authorityLabel: "Competent authority:",
		docsSummary: "Core required documents",
		legalLabel: "Legal basis:",
		disclaimer:
			"Advisory note: Durations reflect statutory review timelines from receipt of a complete dossier and exclude dossier revision or site clearance lead time.",
		stepPrefix: "Step",
	},
} as const;

export function InvestorLicensingRoadmap() {
	const { locale } = useI18n();
	const text = COPY[locale];
	const [track, setTrack] = useState<ProjectTrack>("manufacturing_in_ip");
	const [completedByTrack, setCompletedByTrack] = useState<
		Partial<Record<ProjectTrack, string[]>>
	>({});
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<PersistedState>;
				if (isValidProjectTrack(parsed.track)) {
					setTrack(parsed.track);
				}
				const sanitized = sanitizeCompletedByTrack(parsed.completedByTrack);
				if (Object.keys(sanitized).length > 0) {
					setCompletedByTrack(sanitized);
				}
			}
		} catch {
			// Ignore corrupted localStorage payloads.
		} finally {
			setHydrated(true);
		}
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		try {
			const payload: PersistedState = { track, completedByTrack };
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch {
			// Ignore quota / private-browsing storage errors.
		}
	}, [track, completedByTrack, hydrated]);

	const activeTrackOption =
		PROJECT_TRACK_OPTIONS.find((item) => item.id === track) ??
		PROJECT_TRACK_OPTIONS[0];
	const steps = getRoadmapForTrack(track);
	const completedIds = completedByTrack[track] ?? [];
	const summary = estimateTimelineSummary(track, completedIds);

	function toggleStep(stepId: string) {
		setCompletedByTrack((prev) => {
			const current = prev[track] ?? [];
			const exists = current.includes(stepId);
			const next = exists
				? current.filter((id) => id !== stepId)
				: [...current, stepId];
			return { ...prev, [track]: next };
		});
	}

	function resetCurrentTrack() {
		setCompletedByTrack((prev) => ({ ...prev, [track]: [] }));
	}

	function formatDaysRange(min: number, max: number): string {
		if (min === 0 && max === 0) return `0 ${text.workingDaysUnit}`;
		if (min === max) return `${min} ${text.workingDaysUnit}`;
		return `${min}–${max} ${text.workingDaysUnit}`;
	}

	return (
		<section
			className={styles.roadmap}
			aria-labelledby="fdi-roadmap-heading"
			data-testid="fdi-licensing-roadmap"
		>
			<div className={styles.headerRow}>
				<div className={styles.titleGroup}>
					<h2 id="fdi-roadmap-heading">{text.heading}</h2>
					<p className={styles.subtitle}>{text.subtitle}</p>
				</div>
				<div className={styles.actions}>
					<button
						type="button"
						className={styles.actionBtn}
						onClick={resetCurrentTrack}
						disabled={completedIds.length === 0}
					>
						{text.reset}
					</button>
					<button
						type="button"
						className={styles.actionBtn}
						onClick={() => window.print()}
					>
						{text.print}
					</button>
				</div>
			</div>

			<div
				className={styles.trackGrid}
				role="group"
				aria-label={text.trackSelectorAria}
			>
				{PROJECT_TRACK_OPTIONS.map((option) => {
					const active = option.id === track;
					return (
						<button
							key={option.id}
							type="button"
							aria-pressed={active}
							className={
								active
									? `${styles.trackBtn} ${styles.trackBtnActive}`
									: styles.trackBtn
							}
							onClick={() => setTrack(option.id)}
						>
							<span className={styles.trackTitle}>{option.label[locale]}</span>
						</button>
					);
				})}
			</div>

			<p className={styles.trackNote}>{activeTrackOption.summary[locale]}</p>

			<div className={styles.kpiStrip}>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.totalSteps}</span>
					<span className={styles.kpiValue}>
						{summary.completedSteps}/{summary.totalSteps}
					</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.completion}</span>
					<span className={styles.kpiValue}>{summary.progressPercent}%</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.statutoryTotal}</span>
					<span className={styles.kpiValue}>
						{formatDaysRange(summary.totalMinDays, summary.totalMaxDays)}
					</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.remainingDays}</span>
					<span className={styles.kpiValue}>
						{formatDaysRange(
							summary.remainingMinDays,
							summary.remainingMaxDays,
						)}
					</span>
				</div>
			</div>

			<div
				className={styles.progressTrack}
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={summary.progressPercent}
			>
				<div
					className={styles.progressFill}
					style={{ width: `${summary.progressPercent}%` }}
				/>
			</div>

			<ol className={styles.stepList}>
				{steps.map((step, index) => {
					const checked = completedIds.includes(step.id);
					return (
						<li
							key={step.id}
							className={
								checked
									? `${styles.stepCard} ${styles.stepCardDone}`
									: styles.stepCard
							}
						>
							<div className={styles.stepTop}>
								<label className={styles.checkLabel}>
									<input
										type="checkbox"
										checked={checked}
										onChange={() => toggleStep(step.id)}
									/>
									<span>
										{text.stepPrefix} {index + 1}: {step.title[locale]}
									</span>
								</label>
								<span className={styles.slaBadge}>
									{formatDaysRange(
										step.statutoryWorkingDays.min,
										step.statutoryWorkingDays.max,
									)}
								</span>
							</div>
							<p className={styles.metaRow}>
								<strong>{text.authorityLabel}</strong> {step.authority[locale]}
							</p>
							<p className={styles.metaRow}>{step.notes[locale]}</p>
							<details className={styles.docsDetails}>
								<summary>{text.docsSummary}</summary>
								<ul>
									{step.documents[locale].map((doc) => (
										<li key={doc}>{doc}</li>
									))}
								</ul>
							</details>
							<p className={styles.legalMeta}>
								{text.legalLabel} {step.legalBasis}
							</p>
						</li>
					);
				})}
			</ol>

			<p className={styles.disclaimer}>{text.disclaimer}</p>
		</section>
	);
}
