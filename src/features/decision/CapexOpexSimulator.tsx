"use client";

import { useState } from "react";
import { formalPlaceName } from "../../lib/i18n/data-labels";
import { useI18n } from "../../lib/i18n/provider";
import type { Profile } from "../geography/types";
import { estimateSensitivity } from "./capex-opex";
import { executiveCostBrief } from "./executive-brief";
import { serializeScenarioParams, type ScenarioParams } from "./scenario-url";
import type { ScenarioSnapshot } from "../inquiries/validation";
import {
	matchIncentivesForSectorAndProvinces,
	type InvestmentIncentiveItem,
} from "./investment-incentives";
import type { SectorId } from "./model";

const years = [1, 2, 3, 4, 5];
const regionalMinimum = {
	I: 5310000,
	II: 4730000,
	III: 4140000,
	IV: 3700000,
} as const;
type Region = keyof typeof regionalMinimum;
const parse = (value = "") =>
	value.trim() === "" ? Number.NaN : Number(value);
const rows = [
	"upfront",
	"rent",
	"labor",
	"power",
	"citPaid",
	"citSavings",
	"landSavings",
	"net",
] as const;

export function CapexOpexSimulator({
	provinces,
	sector,
	incentives,
	initialScenario = {},
	onAttach,
}: {
	provinces: Profile[];
	sector: SectorId;
	incentives: readonly InvestmentIncentiveItem[];
	initialScenario?: ScenarioParams;
	onAttach?: (snapshot: ScenarioSnapshot) => void;
}) {
	const { t, locale, formatNumber } = useI18n();
	const [values, setValues] = useState<Record<string, string>>(() => ({
		baseline: "20",
		area: initialScenario.area?.toString() ?? "",
		...Object.fromEntries(
			provinces.flatMap(({ id }) => [
				[`${id}-rent`, initialScenario.rent?.toString() ?? ""],
				[`${id}-power`, initialScenario.elec?.toString() ?? ""],
				[`${id}-region`, initialScenario.region ?? ""],
			]),
		),
	}));
	const [rentShock, setRentShock] = useState(initialScenario.rentShock ?? 0);
	const [elecShock, setElecShock] = useState(initialScenario.elecShock ?? 0);
	const [copyStatus, setCopyStatus] = useState<
		"share.copied" | "share.failed" | null
	>(null);
	const [areaUnit, setAreaUnit] = useState("m²");
	const read = (key: string) => parse(values[key]);
	const write = (key: string, value: string) =>
		setValues((current) => ({ ...current, [key]: value }));
	const field = (
		key: string,
		label: string,
		min = 0,
		max?: number,
		step: number | "any" = "any",
	) => (
		<label key={key}>
			{label}
			<input
				type="number"
				min={min}
				max={max}
				step={step}
				value={values[key] ?? ""}
				onChange={(event) => write(key, event.target.value)}
			/>
		</label>
	);
	const locations = provinces.map((province) => {
		const { id } = province;
		const matches = matchIncentivesForSectorAndProvinces(incentives, sector, [
			province,
		]).incentives;
		const cit = matches.filter(
			(item) => item.incentiveType === "cit_rate_holiday",
		);
		const land = matches.filter(
			(item) => item.incentiveType === "land_rent_exemption",
		);
		const region = values[`${id}-region`] as Region | undefined;
		const useCit = cit.some((item) => item.code === values[`${id}-cit`]);
		const useLand = land.some((item) => item.code === values[`${id}-land`]);
		const monthlyMinimum = region ? regionalMinimum[region] : undefined;
		const wage = values[`${id}-wage`]
			? read(`${id}-wage`)
			: (monthlyMinimum ?? Number.NaN);
		const assumptions = {
			areaM2: read("area") * (areaUnit === "ha" ? 10000 : 1),
			workers: read("workers"),
			annualMWh: read("usage"),
			annualRevenue: years.map((year) => read(`revenue-${year}`)),
			margin: read("margin") / 100,
			baselineCit: read("baseline") / 100,
			rentPerM2Year: read(`${id}-rent`),
			monthlyWage: wage,
			electricityPerKWh: read(`${id}-power`),
			upfront: read(`${id}-upfront`),
		};
		const relief = {
			...(useCit
				? { citRates: years.map((year) => read(`${id}-cit-${year}`) / 100) }
				: {}),
			...(useLand
				? {
						eligibleAnnualLandRent: read(`${id}-eligible`),
						landExemptYears: read(`${id}-years`),
					}
				: {}),
		};
		const sensitivity =
			monthlyMinimum !== undefined && wage >= monthlyMinimum
				? estimateSensitivity(assumptions, relief, rentShock, elecShock)
				: null;
		const estimate = sensitivity?.estimate ?? null;
		return {
			province,
			cit,
			land,
			region,
			useCit,
			useLand,
			assumptions,
			relief,
			estimate,
			sensitivity,
		};
	});
	const segments = ["capex", "rent", "wage", "electricity", "cit"] as const;
	const brief = executiveCostBrief(locations, rentShock, elecShock);
	const colors = ["#0d5654", "#b85d32", "#495c57", "#765e9b", "#557ba4"];
	const keys = ["upfront", "rent", "labor", "power", "citPaid"] as const;
	const signed = (value: number) =>
		`${value > 0 ? "+" : ""}${formatNumber(value)}`;
	const max = Math.max(
		1,
		...locations.flatMap(
			({ estimate }) =>
				estimate?.yearlyBreakdown.map((year) => year.totalNet) ?? [],
		),
	);
	async function copyScenario() {
		const first = locations[0];
		const shared = <T,>(select: (item: typeof first) => T): T | undefined =>
			first && locations.every((item) => select(item) === select(first))
				? select(first)
				: undefined;
		const url = new URL(window.location.href);
		url.search = serializeScenarioParams({
			geos: provinces.map(({ code }) => code),
			sector,
			region: shared((item) => item.region),
			rent: shared((item) => item.assumptions.rentPerM2Year),
			elec: shared((item) => item.assumptions.electricityPerKWh),
			area: first?.assumptions.areaM2,
			rentShock,
			elecShock,
		}).toString();
		try {
			await navigator.clipboard.writeText(url.href);
			setCopyStatus("share.copied");
		} catch {
			setCopyStatus("share.failed");
		}
	}

	function download() {
		const payload = {
			advisoryOnly: true,
			entitlementCertified: false,
			currency: "VND",
			sector,
			rentShock,
			elecShock,
			provinces: locations.map(
				({ province, region, assumptions, relief, estimate }) => ({
					code: province.code,
					name: province.displayName,
					region,
					assumptions,
					relief,
					estimate,
					assumedCitCode: values[`${province.id}-cit`] || null,
					assumedLandCode: values[`${province.id}-land`] || null,
				}),
			),
		};
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(payload, null, 2)], {
				type: "application/json",
			}),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = "advisory-capex-opex.json";
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	function printBrief() {
		const root = document.documentElement;
		const clear = () => root.classList.remove("printing-cost-brief");
		root.classList.add("printing-cost-brief");
		try {
			window.print();
		} finally {
			clear();
		}
	}

	return (
		<section className="cost-simulator" aria-labelledby="cost-title">
			<div className="cost-print-brief">
				<h1>{t("site.print")}</h1>
				<p>
					<strong>Advisory Estimate Only</strong> · {t("cost.warning")}
				</p>
				<p>
					{t("site.rentShock")}: {signed(brief.rentShock)}% ·{" "}
					{t("site.elecShock")}: {signed(brief.elecShock)}%
				</p>
				<table className="comparison-table">
					<caption>{t("cost.summary")}</caption>
					<thead>
						<tr>
							<th scope="col">{t("cost.line")}</th>
							<th scope="col">{t("cost.net")}</th>
							<th scope="col">{t("site.delta")}</th>
						</tr>
					</thead>
					<tbody>
						{brief.rows.map(({ code, name, net, delta }) => (
							<tr key={code}>
								<th scope="row">{name}</th>
								<td>
									{net === null ? t("district.missing") : formatNumber(net)}
								</td>
								<td>
									{delta === null ? t("district.missing") : signed(delta)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="cost-print-method">
					<h2>{t("cost.assumptions")}</h2>
					<p>{t("cost.method")}</p>
					<p>
						{t("site.rentShock")}: {signed(brief.rentShock)}% ·{" "}
						{t("site.elecShock")}: {signed(brief.elecShock)}%
					</p>
				</div>
			</div>
			<h2 id="cost-title">{t("cost.title")}</h2>
			<p className="state-message">
				<strong>Advisory Estimate Only</strong> · {t("cost.warning")}
			</p>
			<fieldset className="cost-fields">
				<legend>{t("cost.assumptions")}</legend>
				{field("area", t("cost.area"))}
				<label>
					{t("cost.areaUnit")}
					<select
						value={areaUnit}
						onChange={(event) => setAreaUnit(event.target.value)}
					>
						<option>m²</option>
						<option>ha</option>
					</select>
				</label>
				{field("workers", t("cost.workers"), 0, undefined, 1)}
				{field("usage", t("cost.usage"))}
				{field("margin", t("cost.margin"), undefined, 100)}
				{field("baseline", t("cost.baseline"), 0, 100)}
				{years.map((year) =>
					field(`revenue-${year}`, t("cost.revenue", { year })),
				)}
			</fieldset>
			<p className="muted">{t("cost.method")}</p>
			{locations.map(({ province, region, cit, land, useCit, useLand }) => {
				const { id } = province;
				return (
					<fieldset key={id} className="cost-fields">
						<legend>{formalPlaceName(locale, province)}</legend>
						<label>
							{t("cost.region")}
							<select
								value={region ?? ""}
								onChange={(event) => write(`${id}-region`, event.target.value)}
							>
								<option value="">—</option>
								{Object.entries(regionalMinimum).map(([key, amount]) => (
									<option key={key} value={key}>
										{key} · {formatNumber(amount)} VND
									</option>
								))}
							</select>
						</label>
						{field(
							`${id}-wage`,
							t("cost.wage"),
							region ? regionalMinimum[region] : 0,
						)}
						{field(`${id}-rent`, t("cost.rentRate"))}
						{field(`${id}-power`, t("cost.powerRate"))}
						{field(`${id}-upfront`, t("cost.upfront"))}
						{(
							[
								["cit", cit],
								["land", land],
							] as const
						).map(([key, matches]) => (
							<label key={key}>
								{t(`cost.${key}Option`)}
								<select
									disabled={!matches.length}
									value={values[`${id}-${key}`] ?? ""}
									onChange={(event) =>
										write(`${id}-${key}`, event.target.value)
									}
								>
									<option value="">{t("cost.noRelief")}</option>
									{matches.map((item) => (
										<option key={item.id} value={item.code}>
											{item.title[locale]} · {item.reference.documentCode}
										</option>
									))}
								</select>
							</label>
						))}
						{useCit &&
							years.map((year) =>
								field(`${id}-cit-${year}`, t("cost.citRate", { year }), 0, 100),
							)}
						{useLand && (
							<>
								{field(`${id}-eligible`, t("cost.eligible"))}
								{field(`${id}-years`, t("cost.years"), 0, 5, 1)}
							</>
						)}
					</fieldset>
				);
			})}
			<div className="comparison-table-wrap">
				<table className="comparison-table">
					<caption>{t("cost.summary")}</caption>
					<thead>
						<tr>
							<th scope="col">{t("cost.line")}</th>
							{locations.map(({ province }) => (
								<th key={province.id} scope="col">
									{formalPlaceName(locale, province)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((key) => (
							<tr key={key}>
								<th scope="row">{t(`cost.${key}`)}</th>
								{locations.map(({ province, estimate }) => (
									<td key={province.id}>
										{estimate
											? formatNumber(estimate[key])
											: t("district.missing")}
									</td>
								))}
							</tr>
						))}
						<tr>
							<th scope="row">{t("site.delta")}</th>
							{locations.map(({ province, sensitivity }) => (
								<td key={province.id}>
									{sensitivity
										? `${signed(sensitivity.delta)} VND${sensitivity.percent === null ? "" : ` (${signed(sensitivity.percent)}%)`}`
										: t("district.missing")}
								</td>
							))}
						</tr>
					</tbody>
				</table>
			</div>
			<div className="cost-fields no-print">
				{(
					[
						["site.rentShock", rentShock, setRentShock],
						["site.elecShock", elecShock, setElecShock],
					] as const
				).map(([label, value, set]) => (
					<label key={label}>
						{t(label)} · {signed(value)}%
						<input
							type="range"
							min={-20}
							max={20}
							step={5}
							value={value}
							onChange={(event) => set(Number(event.target.value))}
						/>
					</label>
				))}
			</div>
			<p>
				{t("site.rentShock")}: {signed(rentShock)}% · {t("site.elecShock")}:{" "}
				{signed(elecShock)}%
			</p>
			{locations.some(({ estimate }) => estimate) && (
				<figure className="cost-chart">
					<figcaption>{t("site.chart")}</figcaption>
					<svg role="img" aria-label={t("site.chart")} viewBox="0 0 600 165">
						{years.map((year, i) => (
							<g key={year}>
								<text x={i * 120 + 48} y={159}>
									{year}
								</text>
								{locations.map(({ province, estimate }, j) => {
									const row = estimate?.yearlyBreakdown[i];
									if (!row) return null;
									let floor = 134;
									return (
										<g key={province.id}>
											<title>
												{province.displayName} · {year} ·{" "}
												{formatNumber(row.totalNet)} VND
											</title>
											{segments.map((key, k) => {
												const height = (row[key] / max) * 125;
												floor -= height;
												return (
													<rect
														key={key}
														x={i * 120 + 12 + j * 31}
														y={floor}
														width={25}
														height={height}
														fill={colors[k]}
													>
														<title>
															{t(`cost.${keys[k]}`)}: {formatNumber(row[key])}{" "}
															VND
														</title>
													</rect>
												);
											})}
											<text x={i * 120 + 15 + j * 31} y={146}>
												{province.code}
											</text>
										</g>
									);
								})}
							</g>
						))}
					</svg>
					<ul>
						{keys.map((key, i) => (
							<li key={key}>
								<span style={{ background: colors[i] }} />
								{t(`cost.${key}`)}
							</li>
						))}
					</ul>
				</figure>
			)}
			<div className="no-print">
				<button type="button" onClick={() => void copyScenario()}>
					{t("site.copy")}
				</button>
				{copyStatus && <span role="status">{t(copyStatus)}</span>}{" "}
				<small>{t("site.shareScope")}</small>
			</div>
			{onAttach && (
				<button
					type="button"
					className="no-print"
					onClick={() =>
						onAttach({
							advisoryOnly: true,
							provinceCodes: provinces.map(({ code }) => code),
							sector,
							costs: locations.map(({ province, estimate }) => ({
								code: province.code,
								net:
									estimate && estimate.net <= Number.MAX_SAFE_INTEGER
										? estimate.net
										: null,
							})),
						})
					}
				>
					{t("site.prepare")}
				</button>
			)}
			{locations.some(({ estimate }) => !estimate) && (
				<p className="muted">{t("cost.incomplete")}</p>
			)}
			<button type="button" onClick={printBrief}>
				{t("site.print")}
			</button>
			<button
				type="button"
				disabled={locations.some(({ estimate }) => !estimate)}
				onClick={download}
			>
				{t("cost.export")}
			</button>
		</section>
	);
}
