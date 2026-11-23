"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import { ComparisonPanel } from "../comparison/ComparisonPanel";
import type { Geography } from "../geography/types";
import { InquiryForm } from "../inquiries/InquiryForm";
import { formalPlaceName } from "../../lib/i18n/data-labels";
import { readCompareIds } from "../map/url-state";
import {
	COMPARISON_LIMIT,
	SHORTLIST_LIMIT,
	readShortlist,
	removeFromShortlist,
	selectForComparison,
} from "./store";

function syncCompareUrl(ids: string[] | null) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	if (ids && ids.length >= 2) url.searchParams.set("compare", ids.join(","));
	else url.searchParams.delete("compare");
	if (url.href !== window.location.href)
		window.history.replaceState(window.history.state, "", url);
}

export function ShortlistTray() {
	const { t, locale } = useI18n();
	const tRef = useRef(t);
	tRef.current = t;
	const [ids, setIds] = useState<string[]>([]);
	const [places, setPlaces] = useState<Geography[]>([]);
	const [loadingPlaces, setLoadingPlaces] = useState(false);
	const [comparisonIds, setComparisonIds] = useState<string[] | null>(null);
	const [urlRestored, setUrlRestored] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const restoreCompare = () => {
			const fromUrl = readCompareIds(window.location.search);
			setComparisonIds(fromUrl.length >= 2 ? fromUrl : null);
			setUrlRestored(true);
		};
		restoreCompare();
		window.addEventListener("popstate", restoreCompare);
		return () => window.removeEventListener("popstate", restoreCompare);
	}, []);

	useEffect(() => {
		if (!urlRestored) return;
		syncCompareUrl(comparisonIds);
	}, [urlRestored, comparisonIds]);

	useEffect(() => {
		const sync = () => {
			try {
				setIds(readShortlist(localStorage.getItem("investor-shortlist")));
			} catch {
				setError(tRef.current("shortlist.storageError"));
			}
		};
		sync();
		const handleChange = () => sync();
		window.addEventListener("investor-shortlist-change", handleChange);
		window.addEventListener("storage", handleChange);
		return () => {
			window.removeEventListener("investor-shortlist-change", handleChange);
			window.removeEventListener("storage", handleChange);
		};
	}, []);

	useEffect(() => {
		setError(null);
		if (!ids.length) {
			setPlaces([]);
			setLoadingPlaces(false);
			return;
		}
		setLoadingPlaces(true);
		const controller = new AbortController();
		fetch(
			`/api/geographies/batch?ids=${ids.map((id) => encodeURIComponent(id)).join(",")}`,
			{
				signal: controller.signal,
			},
		)
			.then(async (response) => {
				if (response.status === 404) {
					return { places: [] as Geography[], someMissing: true };
				}
				if (!response.ok) {
					throw new Error("Shortlist batch failed");
				}
				const body = (await response.json().catch(() => null)) as {
					data?: Geography[];
				} | null;
				if (!body || !Array.isArray(body.data)) {
					throw new Error("Unexpected shortlist batch response");
				}
				return {
					places: body.data,
					someMissing: body.data.length < ids.length,
				};
			})
			.then(({ places: nextPlaces, someMissing }) => {
				if (controller.signal.aborted) return;
				setPlaces(nextPlaces);
				setLoadingPlaces(false);
				setError(someMissing ? tRef.current("shortlist.someMissing") : null);
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setLoadingPlaces(false);
					setError(tRef.current("shortlist.loadFailed"));
				}
			});
		return () => controller.abort();
	}, [ids]);

	function remove(id: string) {
		try {
			const next = removeFromShortlist(
				readShortlist(localStorage.getItem("investor-shortlist")),
				id,
			);
			localStorage.setItem("investor-shortlist", JSON.stringify(next));
			setIds(next);
			setComparisonIds((current) => (current?.includes(id) ? null : current));
			window.dispatchEvent(
				new CustomEvent("investor-shortlist-change", { detail: next }),
			);
		} catch {
			setError(t("shortlist.storageError"));
		}
	}

	async function download(format: "json" | "csv") {
		setError(null);
		try {
			const response = await fetch(
				`/api/geographies/export?ids=${ids.map((id) => encodeURIComponent(id)).join(",")}&format=${format}`,
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(body?.error ?? t("shortlist.exportUnavailable"));
			}
			const blob = await response.blob();
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = `vietnam-market-context.${format}`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(link.href);
		} catch (reason: unknown) {
			setError(
				reason instanceof Error
					? reason.message
					: t("shortlist.exportUnavailable"),
			);
		}
	}

	const placesById = new Map(places.map((place) => [place.id, place]));
	const resolvedCount = loadingPlaces
		? Math.max(places.length, ids.length)
		: places.length;

	if (!ids.length && !comparisonIds) return null;
	return (
		<>
			{ids.length > 0 && (
				<section
					className="shortlist-tray"
					aria-label={t("shortlist.savedPlaces")}
				>
					<div className="shortlist-heading">
						<div>
							<span className="muted">{t("shortlist.savedPlaces")}</span>
							<strong className="tabular-nums">
								{t("shortlist.savedCount", { count: resolvedCount })} (
								{ids.length}/{SHORTLIST_LIMIT})
							</strong>
						</div>
						<div className="action-row">
							{ids.length >= 2 ? (
								<>
									<button
										type="button"
										className="btn btn-primary btn-sm"
										onClick={() => setComparisonIds(selectForComparison(ids))}
									>
										{t("shortlist.compare", {
											count: Math.min(ids.length, COMPARISON_LIMIT),
										})}
									</button>
									<a
										href={`/decision?provinces=${encodeURIComponent(selectForComparison(ids).join(","))}`}
										className="btn btn-secondary btn-sm"
									>
										{t("shortlist.openDecision")}
									</a>
								</>
							) : null}
							<button
								type="button"
								className="btn btn-quiet btn-sm"
								onClick={() => download("json")}
							>
								{t("shortlist.downloadJson")}
							</button>
							<button
								type="button"
								className="btn btn-quiet btn-sm"
								onClick={() => download("csv")}
							>
								{t("shortlist.downloadCsv")}
							</button>
						</div>
					</div>
					{error ? (
						<p className="banner banner--warning" role="status">
							{error}
						</p>
					) : null}
					<ul>
						{ids.map((id) => {
							const place = placesById.get(id);
							return (
								<li key={id}>
									<span>
										{place
											? formalPlaceName(locale, place)
											: loadingPlaces
												? t("common.loading")
												: t("shortlist.removedPlace")}
									</span>
									<button
										type="button"
										className="btn btn-quiet btn-sm"
										onClick={() => remove(id)}
										aria-label={
											place
												? t("shortlist.removeAria", { name: place.displayName })
												: t("shortlist.unavailableAria")
										}
									>
										{t("common.remove")}
									</button>
								</li>
							);
						})}
					</ul>
					<details className="inquiry-entry">
						<summary>{t("shortlist.requestSupport")}</summary>
						<InquiryForm
							key={ids.join(",")}
							geographyIds={ids}
							geographyLabels={places.map((place) => place.displayName)}
						/>
					</details>
				</section>
			)}
			{comparisonIds ? (
				<ComparisonPanel
					ids={comparisonIds}
					onClose={() => setComparisonIds(null)}
				/>
			) : null}
		</>
	);
}
