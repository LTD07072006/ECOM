"use client";

import { useState } from "react";
import { formalPlaceName } from "../../lib/i18n/data-labels";
import { useI18n } from "../../lib/i18n/provider";
import type { Profile } from "../geography/types";
import { estimateFiveYears } from "./capex-opex";
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
}: {
	provinces: Profile[];
	sector: SectorId;
	incentives: readonly InvestmentIncentiveItem[];
}) {
	const { t, locale, formatNumber } = useI18n();
	const [values, setValues] = useState<Record<string, string>>({
		baseline: "20",
	});
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
		const estimate =
			monthlyMinimum !== undefined && wage >= monthlyMinimum
				? estimateFiveYears(assumptions, relief)
				: null;
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
		};
	});

	function download() {
		const payload = {
			advisoryOnly: true,
			entitlementCertified: false,
			currency: "VND",
			sector,
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

	return (
		<section className="cost-simulator" aria-labelledby="cost-title">
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
					</tbody>
				</table>
			</div>
			{locations.some(({ estimate }) => !estimate) && (
				<p className="muted">{t("cost.incomplete")}</p>
			)}
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
