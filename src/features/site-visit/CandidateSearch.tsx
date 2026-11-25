"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import type { SiteVisitCandidate } from "./site-visit-state";
import { WEMAP_TOKEN } from "./wemap-config";

type Props = { onSelect: (candidate: SiteVisitCandidate) => void };

export function CandidateSearch({ onSelect }: Props) {
	const { t } = useI18n();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SiteVisitCandidate[]>([]);
	const [pending, setPending] = useState(false);
	const sequence = useRef(0);
	useEffect(() => {
		const value = query.trim();
		if (value.length < 2) {
			setResults([]);
			return;
		}
		const id = ++sequence.current;
		const controller = new AbortController();
		const timer = setTimeout(() => {
			setPending(true);
			void import("wemap-gl-js")
				.then(async (wemap) => {
					const token = WEMAP_TOKEN;
					if (id !== sequence.current) return;
					const provider = wemap.default.weGeoCoderProvider({
						version: 1,
						apiKey: token,
					});
					const found = await provider.search(
						value,
						{ apiKey: token, language: "vi", countries: "vn", limit: 5 },
						controller.signal,
					);
					if (id !== sequence.current) return;
					setResults(
						found.flatMap((item) => {
							const coordinates = item.center;
							return coordinates &&
								coordinates.length >= 2 &&
								Number.isFinite(coordinates[0]) &&
								Number.isFinite(coordinates[1])
								? [
										{
											label: item.place_name ?? value,
											longitude: coordinates[0],
											latitude: coordinates[1],
										},
									]
								: [];
						}),
					);
				})
				.catch(() => {
					if (id === sequence.current) setResults([]);
				})
				.finally(() => {
					if (id === sequence.current) setPending(false);
				});
		}, 300);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query]);
	return (
		<div className="site-visit-search">
			<label htmlFor="site-visit-search">{t("siteVisit.searchLabel")}</label>
			<input
				id="site-visit-search"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder={t("siteVisit.searchPlaceholder")}
				autoComplete="off"
			/>
			{pending && <p role="status">{t("siteVisit.searching")}</p>}
			{results.length > 0 && (
				<ul className="site-visit-search-results">
					{results.map((result) => (
						<li key={`${result.longitude}:${result.latitude}:${result.label}`}>
							<button
								type="button"
								onClick={() => {
									onSelect(result);
									setQuery(result.label);
									setResults([]);
								}}
							>
								{result.label}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
