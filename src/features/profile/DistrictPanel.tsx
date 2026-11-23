"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import type { Profile } from "../geography/types";
import type { ProvinceMicroLocation } from "../map/province-detail-locations";
import { UtilitySpecs } from "./UtilitySpecs";
import {
	classifyDistrict,
	type ProvinceDistrictProfile,
} from "../map/province-districts";

const sectors = ["retail", "manufacturing", "logistics", "enterprise"] as const;

export function DistrictPanel({
	province,
	locations,
	onSelect,
	onLocate,
}: {
	province: Profile;
	locations: ProvinceMicroLocation[];
	onSelect?: (district: ProvinceDistrictProfile | null) => void;
	onLocate: (location: ProvinceMicroLocation) => void;
}) {
	const { locale, t, formatNumber } = useI18n();
	const [items, setItems] = useState<ProvinceDistrictProfile[] | null>(null);
	const [error, setError] = useState(false);
	const [attempt, setAttempt] = useState(0);
	const [selected, setSelected] = useState<ProvinceDistrictProfile | null>(
		null,
	);
	const [kind, setKind] = useState("");
	const [sector, setSector] = useState("");
	const [query, setQuery] = useState("");
	const [compare, setCompare] = useState<string[]>([]);
	useEffect(() => {
		const request = new AbortController();
		fetch(`/api/geographies/${encodeURIComponent(province.id)}/districts`, {
			signal: request.signal,
			cache: attempt > 0 ? "reload" : "default",
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("District request failed");
				const result: { data: ProvinceDistrictProfile[] } =
					await response.json();
				if (!request.signal.aborted) setItems(result.data);
			})
			.catch(() => {
				if (!request.signal.aborted) setError(true);
			});
		return () => request.abort();
	}, [province.id, attempt]);
	const select = (item: ProvinceDistrictProfile | null) => {
		setSelected(item);
		onSelect?.(item);
	};
	const missing = t("district.missing");
	const number = (value: number | null) =>
		value === null ? missing : formatNumber(value);
	const role = (item: ProvinceDistrictProfile) =>
		item.economicRole?.[locale] ?? missing;
	const linked = (item: ProvinceDistrictProfile) =>
		locations.filter((location) =>
			item.linkedMicroLocationIds.includes(location.id),
		);
	const count = (item: ProvinceDistrictProfile) =>
		item.linkedMicroLocationIds.length
			? formatNumber(
					linked(item).filter(
						(location) => location.category !== "logistics_hub",
					).length,
				)
			: missing;
	const recommendations = (item: ProvinceDistrictProfile) =>
		item.recommendedSectors
			.map(({ sector }) => t(`district.${sector}`))
			.join(", ") || missing;
	const scope = (item: ProvinceDistrictProfile) =>
		t(item.scope === "current" ? "district.current" : "district.advisory");
	if (error)
		return (
			<p role="status">
				{t("district.error")}{" "}
				<button
					type="button"
					onClick={() => {
						setError(false);
						setAttempt(attempt + 1);
					}}
				>
					{t("district.retry")}
				</button>
			</p>
		);
	if (!items) return <p role="status">{t("district.loading")}</p>;
	if (selected)
		return (
			<section className="district-panel">
				<button type="button" onClick={() => select(null)}>
					{t("district.back")}
				</button>
				<h3>{selected.name[locale]}</h3>
				<p className="muted">{scope(selected)}</p>
				<dl className="dataset-details">
					<div>
						<dt>{t("district.role")}</dt>
						<dd>{role(selected)}</dd>
					</div>
					<div>
						<dt>{t("district.population")}</dt>
						<dd>{number(selected.demographics.population)}</dd>
					</div>
					<div>
						<dt>{t("district.density")}</dt>
						<dd>{number(selected.demographics.density)}</dd>
					</div>
					<div>
						<dt>{t("district.purchasingPower")}</dt>
						<dd>
							{selected.demographics.purchasingPower?.[locale] ?? missing}
						</dd>
					</div>
					<div>
						<dt>{t("district.urbanization")}</dt>
						<dd>
							{selected.demographics.urbanization === null
								? missing
								: `${number(selected.demographics.urbanization)}%`}
						</dd>
					</div>
					<div>
						<dt>{t("district.connections")}</dt>
						<dd>
							{selected.realEstateAndUtilities.connections?.[locale] ?? missing}
						</dd>
					</div>
					<div>
						<dt>{t("district.rent")}</dt>
						<dd>{selected.realEstateAndUtilities.rent?.[locale] ?? missing}</dd>
					</div>
				</dl>
				<p className="muted">{selected.demographics.sourceNote[locale]}</p>
				{selected.scope === "advisory" && (
					<p className="muted">{t("district.noMembership")}</p>
				)}
				<h4>{t("district.sectors")}</h4>
				{selected.recommendedSectors.length ? (
					<ul>
						{selected.recommendedSectors.map(({ sector, reason }) => (
							<li key={sector}>
								{t(`district.${sector}`)}: {reason[locale]}
							</li>
						))}
					</ul>
				) : (
					<p>{missing}</p>
				)}
				<h4>{t("district.locations")}</h4>
				{linked(selected).length ? (
					<ul>
						{linked(selected).map((item) => (
							<li key={item.id}>
								<button type="button" onClick={() => onLocate(item)}>
									{item.name[locale]}
								</button>
								<UtilitySpecs location={item} />
							</li>
						))}
					</ul>
				) : (
					<p>{missing}</p>
				)}
			</section>
		);
	const visible = items.filter(
		(item) =>
			(!kind ||
				kind ===
					classifyDistrict(item.scope, item.recommendedSectors[0]?.sector)) &&
			(!sector ||
				item.recommendedSectors.some((entry) => entry.sector === sector)) &&
			item.name[locale]
				.toLocaleLowerCase(locale)
				.includes(query.trim().toLocaleLowerCase(locale)),
	);
	const compared = compare.flatMap((id) =>
		items.filter((item) => item.id === id),
	);
	return (
		<section className="district-panel">
			<p className="muted">{t("district.explainer")}</p>
			<div className="district-filters">
				<label>
					{t("district.search")}
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</label>
				<label>
					{t("district.category")}
					<select
						value={kind}
						onChange={(event) => setKind(event.target.value)}
					>
						<option value="">{t("district.all")}</option>
						{(["urban", "industrial", "gateway", "ward_cluster"] as const).map(
							(key) => (
								<option key={key} value={key}>
									{t(`district.${key}`)}
								</option>
							),
						)}
					</select>
				</label>
				<label>
					{t("district.sectors")}
					<select
						value={sector}
						onChange={(event) => setSector(event.target.value)}
					>
						<option value="">{t("district.all")}</option>
						{sectors.map((key) => (
							<option key={key} value={key}>
								{t(`district.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>
			<p>{t("district.compareHint")}</p>
			{compared.length >= 2 && (
				<div className="district-comparison">
					<table>
						<caption>{t("district.compare")}</caption>
						<thead>
							<tr>
								<td />
								{compared.map((item) => (
									<th scope="col" key={item.id}>
										{item.name[locale]}
										<br />
										{scope(item)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{(
								[
									[
										"district.population",
										(item: ProvinceDistrictProfile) =>
											number(item.demographics.population),
									],
									[
										"district.density",
										(item: ProvinceDistrictProfile) =>
											number(item.demographics.density),
									],
									["district.role", role],
									["district.zoneCount", count],
									["district.sectors", recommendations],
								] as const
							).map(([key, value]) => (
								<tr key={key}>
									<th scope="row">{t(key)}</th>
									{compared.map((item) => (
										<td key={item.id}>{value(item)}</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{!visible.length ? (
				<p role="status">{t("district.empty")}</p>
			) : (
				<ul className="district-list">
					{visible.map((item) => (
						<li className="district-card" key={item.id}>
							<div>
								<button type="button" onClick={() => select(item)}>
									{item.name[locale]}
								</button>
								<p className="muted">
									{scope(item)}
									{item.economicRole ? ` · ${role(item)}` : ""}
								</p>
							</div>
							<label>
								<input
									type="checkbox"
									checked={compare.includes(item.id)}
									disabled={compare.length >= 3 && !compare.includes(item.id)}
									onChange={(event) =>
										setCompare(
											event.target.checked
												? [...compare, item.id]
												: compare.filter((id) => id !== item.id),
										)
									}
									aria-label={`${t("district.compare")}: ${item.name[locale]}`}
								/>{" "}
								{t("district.compare")}
							</label>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
