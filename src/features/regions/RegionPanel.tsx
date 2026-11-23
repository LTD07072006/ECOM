"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../geography/types";
import { indicatorLabel, unitLabel } from "../../lib/i18n/data-labels";
import { useI18n } from "../../lib/i18n/provider";
import { regionQueryParams } from "../map/url-state";
import { readSavedRegions, type SavedRegionComparison } from "./storage";
import {
	compatibleRegionMetrics,
	regionIndicators,
	regionMetric,
} from "./model";
import { buildRegionExport, regionExportToCsv } from "./export";

export type RegionIds = [string[], string[]];

function triggerDownload(content: string, mimeType: string, filename: string) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RegionPanel({
	regions,
	active,
	setActive,
	remove,
	clear,
	addCurrent,
	canAddCurrent,
	restore,
}: {
	regions: RegionIds;
	active: number;
	setActive: (index: number) => void;
	restore: (regions: RegionIds) => void;
	remove: (index: number, id: string) => void;
	clear: () => void;
	addCurrent: () => void;
	canAddCurrent: boolean;
}) {
	const { t, locale, formatNumber } = useI18n();
	const [saved, setSaved] = useState<SavedRegionComparison[]>([]);
	const [name, setName] = useState("");
	const [reportDate, setReportDate] = useState("");
	const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
		null,
	);
	const [undoClearRegions, setUndoClearRegions] = useState<RegionIds | null>(
		null,
	);
	const [shareStatus, setShareStatus] = useState<
		"share.copied" | "share.failed" | null
	>(null);
	useEffect(() => {
		setReportDate(
			new Date().toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US"),
		);
	}, [locale]);
	const [storageMessage, setStorageMessage] = useState("");
	useEffect(() => {
		try {
			setSaved(readSavedRegions(localStorage.getItem("ecom-regions-v1")));
		} catch {
			setStorageMessage(t("region.storageFailed"));
		}
	}, [t]);
	function saveRegions() {
		if (!name.trim() || !regions.flat().length) return;
		const next = [
			{
				name: name.trim().slice(0, 80),
				regions,
				savedAt: new Date().toISOString(),
			},
			...saved,
		].slice(0, 20);
		try {
			localStorage.setItem("ecom-regions-v1", JSON.stringify(next));
			setSaved(next);
			setName("");
			setStorageMessage(t("region.saveSuccess"));
		} catch {
			setStorageMessage(t("region.storageFailed"));
		}
	}
	function deleteSaved(index: number) {
		const next = saved.filter((_, i) => i !== index);
		try {
			localStorage.setItem("ecom-regions-v1", JSON.stringify(next));
			setSaved(next);
			setConfirmDeleteIndex(null);
		} catch {
			setStorageMessage(t("region.storageFailed"));
		}
	}
	function handleClearRegions() {
		if (regions.flat().length > 0) {
			setUndoClearRegions([regions[0].slice(), regions[1].slice()]);
		}
		clear();
	}
	async function copyRegionLink() {
		try {
			const url = new URL(window.location.href);
			const { regionA, regionB } = regionQueryParams(regions);
			if (regionA) url.searchParams.set("regionA", regionA);
			else url.searchParams.delete("regionA");
			if (regionB) url.searchParams.set("regionB", regionB);
			else url.searchParams.delete("regionB");
			await navigator.clipboard.writeText(url.toString());
			setShareStatus("share.copied");
		} catch {
			setShareStatus("share.failed");
		}
	}
	function downloadRegion(format: "json" | "csv") {
		const payload = buildRegionExport(regions, profiles);
		if (format === "json") {
			triggerDownload(
				JSON.stringify(payload, null, 2),
				"application/json; charset=utf-8",
				"vietnam-region-comparison.json",
			);
		} else {
			triggerDownload(
				regionExportToCsv(payload),
				"text/csv; charset=utf-8",
				"vietnam-region-comparison.csv",
			);
		}
	}

	const [profiles, setProfiles] = useState<Record<string, Profile>>({});
	const [completed, setCompleted] = useState<{
		key: string;
		failed: boolean;
	}>();
	const key = regions.flat().join(",");
	const loading = !!key && completed?.key !== key;
	const failed = !!key && completed?.key === key && completed.failed;
	useEffect(() => {
		const controller = new AbortController();
		setCompleted(undefined);
		const ids = key ? key.split(",") : [];
		if (!ids.length) return;
		fetch(`/api/geographies/batch?ids=${encodeURIComponent(ids.join(","))}`, {
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("Profile unavailable");
				const body: { data: Profile[] } = await response.json();
				if (!Array.isArray(body.data) || body.data.length !== ids.length) {
					throw new Error("Unexpected province batch response");
				}
				for (const profile of body.data) {
					if (!ids.includes(profile.id) || profile.level !== "province") {
						throw new Error("Unexpected province profile");
					}
				}
				return body.data;
			})
			.then((data) => {
				if (controller.signal.aborted) return;
				setProfiles(
					Object.fromEntries(data.map((profile) => [profile.id, profile])),
				);
				setCompleted({ key, failed: false });
			})
			.catch(() => {
				if (!controller.signal.aborted) setCompleted({ key, failed: true });
			});
		return () => controller.abort();
	}, [key]);
	const names = [t("region.a"), t("region.b")];
	const canExport = !loading && !failed && Boolean(key);

	return (
		<section className="region-panel" aria-labelledby="region-title">
			<h2 id="region-title">{t("region.title")}</h2>
			<p className="muted">{t("region.instructions")}</p>
			<p className="muted">{t("region.scope")}</p>
			<fieldset>
				<legend>{t("region.mode")}</legend>
				{names.map((regionName, index) => (
					<label key={regionName} className="checkbox-field">
						<input
							type="radio"
							name="region-active"
							checked={active === index}
							onChange={() => setActive(index)}
						/>
						<span>{regionName}</span>
					</label>
				))}
			</fieldset>
			<p className="muted" role="status">
				{t("region.active", { region: names[active] })}
			</p>
			<div className="action-row action-row--split">
				<button
					type="button"
					className="btn btn-primary btn-sm"
					onClick={addCurrent}
					disabled={!canAddCurrent}
				>
					{t("region.add")}
				</button>
				<button
					type="button"
					className="btn btn-destructive btn-sm"
					onClick={handleClearRegions}
				>
					{t("region.clear")}
				</button>
			</div>
			{undoClearRegions && (
				<div className="banner banner--info" role="status">
					<span>{t("region.clearedNotice")}</span>
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={() => {
							restore(undoClearRegions);
							setUndoClearRegions(null);
						}}
					>
						{t("common.undo")}
					</button>
				</div>
			)}
			<p className="muted">{t("region.limit")}</p>
			{regions.map((ids, index) => (
				<div key={names[index]}>
					<h3>{names[index]}</h3>
					{ids.length === 0 ? (
						<p className="muted">{t("region.empty")}</p>
					) : (
						<ul>
							{ids.map((id) => (
								<li key={id} className="action-row action-row--split">
									<span>{profiles[id]?.displayName ?? id}</span>
									<button
										type="button"
										className="btn btn-quiet btn-sm"
										onClick={() => remove(index, id)}
										aria-label={t("region.remove", {
											name: profiles[id]?.displayName ?? id,
										})}
									>
										{t("common.remove")}
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			))}
			<div className="form-stack">
				<label className="form-field">
					{t("region.saveName")}
					<input
						className="control-input"
						maxLength={80}
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</label>
				<div>
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={saveRegions}
						disabled={!name.trim() || !regions.flat().length}
					>
						{t("region.save")}
					</button>
				</div>
				{storageMessage && (
					<p className="muted" role="status">
						{storageMessage}
					</p>
				)}
				{saved.length > 0 && (
					<>
						<h3>{t("region.saved")}</h3>
						<ul>
							{saved.map((item, index) => (
								<li
									key={`${item.savedAt}-${index}`}
									className="action-row action-row--split"
								>
									<span>{item.name}</span>
									<span className="action-row">
										<button
											type="button"
											className="btn btn-secondary btn-sm"
											onClick={() => restore(item.regions)}
										>
											{t("region.restore")}
										</button>
										{confirmDeleteIndex === index ? (
											<>
												<button
													type="button"
													className="btn btn-destructive btn-sm"
													onClick={() => deleteSaved(index)}
												>
													{t("common.confirm")}
												</button>
												<button
													type="button"
													className="btn btn-quiet btn-sm"
													onClick={() => setConfirmDeleteIndex(null)}
												>
													{t("common.cancel")}
												</button>
											</>
										) : (
											<button
												type="button"
												className="btn btn-destructive btn-sm"
												onClick={() => setConfirmDeleteIndex(index)}
											>
												{t("region.deleteSaved")}
											</button>
										)}
									</span>
								</li>
							))}
						</ul>
					</>
				)}
			</div>
			<div className="action-row">
				<button
					type="button"
					className="btn btn-secondary btn-sm"
					onClick={() => {
						document.body.classList.add("print-region");
						window.addEventListener(
							"afterprint",
							() => document.body.classList.remove("print-region"),
							{ once: true },
						);
						window.print();
					}}
					disabled={!canExport}
				>
					{t("region.print")}
				</button>
				<button
					type="button"
					className="btn btn-quiet btn-sm"
					onClick={() => downloadRegion("json")}
					disabled={!canExport}
				>
					{t("region.downloadJson")}
				</button>
				<button
					type="button"
					className="btn btn-quiet btn-sm"
					onClick={() => downloadRegion("csv")}
					disabled={!canExport}
				>
					{t("region.downloadCsv")}
				</button>
				<button
					type="button"
					className="btn btn-quiet btn-sm"
					onClick={() => void copyRegionLink()}
					disabled={!key}
				>
					{t("region.share")}
				</button>
				{shareStatus && (
					<span role="status" className="muted">
						{t(shareStatus)}
					</span>
				)}
			</div>
			<p className="muted">
				{t("region.reportDate")}: {reportDate}
			</p>
			<p className="muted">{t("region.reportWarning")}</p>
			<h3>{t("region.summary")}</h3>
			<p className="muted">{t("region.method")}</p>
			{loading ? (
				<p className="muted" role="status">
					{t("region.loading")}
				</p>
			) : failed ? (
				<p className="field-error" role="alert">
					{t("region.loadError")}
				</p>
			) : (
				regionIndicators.map((indicator) => {
					const groups = regions.map((ids) =>
						ids
							.map((id) => profiles[id])
							.filter((item): item is Profile => !!item),
					);
					const metrics = groups.map((group) => regionMetric(group, indicator));
					const sample = metrics.find((metric) => metric.value !== null);
					return (
						<div className="region-metric" key={indicator}>
							<h4>
								{indicatorLabel(
									locale,
									indicator,
									sample?.value !== null && sample
										? sample.observation.label
										: indicator,
								)}
							</h4>
							{metrics.map((metric, index) => (
								<div key={names[index]} className="tabular-nums">
									<strong>{names[index]}: </strong>
									{metric.value === null ? (
										metric.reason === "empty" ? (
											t("region.empty")
										) : (
											t(
												metric.reason === "missing"
													? "region.missing"
													: "region.incompatible",
											)
										)
									) : (
										<>
											{formatNumber(metric.value)}{" "}
											{unitLabel(locale, metric.observation.unit)}
											<br />
											<small className="muted">
												{t("region.source")}:{" "}
												{metric.observation.source.url ? (
													<a href={metric.observation.source.url}>
														{metric.observation.source.publisher}
													</a>
												) : (
													metric.observation.source.publisher
												)}{" "}
												· {metric.observation.period} ·{" "}
												{metric.observation.datasetVersion} ·{" "}
												{regions[index].length} {t("common.places")}
											</small>
										</>
									)}
								</div>
							))}
							<p className="tabular-nums">
								{compatibleRegionMetrics(metrics[0], metrics[1]) &&
								metrics[0].value !== null &&
								metrics[1].value !== null
									? `${t("region.difference")}: ${formatNumber(metrics[1].value - metrics[0].value)} ${unitLabel(locale, metrics[0].observation.unit)}`
									: t("region.noCompare")}
							</p>
						</div>
					);
				})
			)}
		</section>
	);
}
