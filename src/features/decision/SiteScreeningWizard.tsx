"use client";

import { useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import type { Profile } from "../geography/types";
import { InquiryForm } from "../inquiries/InquiryForm";
import { getProvinceDistricts } from "../map/province-districts";
import { catchmentFacilities } from "../map/proximity";
import { sectorScenarios, type SectorId } from "./model";
import {
	screenLocations,
	infrastructurePrioritiesFromFacilities,
	type InfrastructurePriority,
	type ScreeningInput,
} from "./site-screening";
import { pilotParksForDistrict, verificationFields } from "./site-verification";

export function SiteScreeningWizard({
	provinces,
	onCompare,
}: {
	provinces: Profile[];
	onCompare: (sector: SectorId, ids: string[]) => void;
}) {
	const { t, locale, formatNumber } = useI18n();
	const [input, setInput] = useState<ScreeningInput>({
		sector: "manufacturing",
		areaM2: null,
		infrastructure: "any",
		region: "any",
	});
	const [area, setArea] = useState("");
	const [ha, setHa] = useState(true);
	const [submitted, setSubmitted] = useState<ScreeningInput | null>(null);
	const result =
		submitted &&
		screenLocations(
			submitted,
			provinces.flatMap((province) =>
				getProvinceDistricts(province, []).flatMap((district) => {
					const parks = pilotParksForDistrict(
						province.code,
						district.linkedMicroLocationIds,
					);
					return (parks.length ? parks : [undefined]).map((park) => {
						const longitude = park?.longitude ?? district.longitude;
						const latitude = park?.latitude ?? district.latitude;
						const facilities =
							longitude === null || latitude === null
								? []
								: catchmentFacilities([longitude, latitude]);
						const infrastructure = infrastructurePrioritiesFromFacilities(
							facilities.map((facility) => ({
								kind: facility.kind,
								airportClassification: facility.airportClassification,
								airportOperationalStatus: facility.airportOperationalStatus,
								portType: facility.portType,
								portOperationalStatus: facility.portOperationalStatus,
							})),
						);
						const area = park?.fields.area;
						return {
							id: park ? `${district.id}:${park.id}` : district.id,
							park,
							provinceId: province.id,
							provinceName: province.displayName,
							name: `${district.name[locale]} · ${province.displayName}`,
							sectors: district.recommendedSectors.map(({ sector }) => sector),
							availableAreaM2: area ? area.value * 10000 : null,
							wageRegion: park?.fields.region?.value ?? null,
							infrastructure:
								infrastructure === null
									? null
									: infrastructure.includes(
												submitted.infrastructure as InfrastructurePriority,
											)
										? infrastructure
										: [],
						};
					});
				}),
			),
		);
	const ids = [
		...new Set(result?.matches.map((item) => item.provinceId)),
	].slice(0, 3);
	return (
		<section>
			<h2>{t("screen.title")}</h2>
			<p>{t("screen.caveat")}</p>
			<form
				className="cost-fields"
				onSubmit={(event) => {
					event.preventDefault();
					setSubmitted({
						...input,
						areaM2: area === "" ? null : Number(area) * (ha ? 10000 : 1),
					});
				}}
			>
				<label>
					{t("screen.sector")}
					<select
						value={input.sector}
						onChange={(event) =>
							setInput({
								...input,
								sector: event.target.value as ScreeningInput["sector"],
							})
						}
					>
						{Object.values(sectorScenarios).map((item) => (
							<option key={item.id} value={item.id}>
								{t(item.labelKey)}
							</option>
						))}
						<option value="electronics">{t("screen.electronics")}</option>
					</select>
				</label>
				<label>
					{t("screen.area")}
					<input
						type="number"
						min="0"
						max="100000000"
						step="any"
						value={area}
						onChange={(event) => setArea(event.target.value)}
					/>
				</label>
				<label>
					{t("cost.areaUnit")}
					<select
						value={ha ? "ha" : "m²"}
						onChange={(event) => setHa(event.target.value === "ha")}
					>
						<option>ha</option>
						<option>m²</option>
					</select>
				</label>
				<label>
					{t("screen.infrastructure")}
					<select
						value={input.infrastructure}
						onChange={(event) =>
							setInput({
								...input,
								infrastructure: event.target
									.value as ScreeningInput["infrastructure"],
							})
						}
					>
						<option value="any">{t("district.all")}</option>
						{(
							["deep_port", "international_airport", "expressway"] as const
						).map((key) => (
							<option key={key} value={key}>
								{t(`screen.${key}`)}
							</option>
						))}
					</select>
				</label>
				<label>
					{t("screen.region")}
					<select
						value={input.region}
						onChange={(event) =>
							setInput({
								...input,
								region: event.target.value as ScreeningInput["region"],
							})
						}
					>
						<option value="any">{t("district.all")}</option>
						{["I", "II", "III", "IV"].map((key) => (
							<option key={key}>{key}</option>
						))}
					</select>
				</label>
				<button type="submit">{t("screen.run")}</button>
			</form>
			{result && submitted && (
				<div aria-live="polite">
					{(
						[
							["verified", result.matches],
							["unknown", result.needsVerification],
						] as const
					).map(([key, items]) => (
						<div key={key}>
							<h3>{t(`screen.${key}`)}</h3>
							{items.length ? (
								<ol>
									{items.map((item) => (
										<li key={item.id}>
											<strong>
												{item.park
													? `${item.park.name[locale]} · ${item.provinceName}`
													: item.name}
											</strong>
											<p>
												{item.reasons
													.map((reason) => t(`screen.${reason}`))
													.join(" · ")}
												{item.missing.length > 0 &&
													` — ${t("district.missing")}: ${item.missing.map((reason) => t(`screen.${reason}`)).join(" · ")}`}
											</p>
											{item.park && (
												<>
													<dl>
														{(
															[
																["area", "site.availableLandHa"],
																["region", "screen.region"],
																["power", "site.powerCapacityMva"],
																["wastewater", "site.wastewaterCapacityM3Day"],
															] as const
														).map(([field, label]) => {
															const record = item.park?.fields[field];
															return (
																<div key={field}>
																	<dt>{t(label)}</dt>
																	<dd>
																		{record ? (
																			<>
																				<a href={record.sourceUrl}>
																					{typeof record.value === "number"
																						? formatNumber(record.value)
																						: record.value}
																				</a>{" "}
																				· {record.verifiedOn} · {record.scope}
																			</>
																		) : (
																			t("district.missing")
																		)}
																	</dd>
																</div>
															);
														})}
													</dl>
													<a href={item.park.contactUrl}>
														{t("screen.verificationContact")}
													</a>
												</>
											)}
											{item.missing.length > 0 && (
												<details>
													<summary>{t("screen.verificationDraft")}</summary>
													<InquiryForm
														key={JSON.stringify(submitted)}
														geographyIds={[item.provinceId]}
														geographyLabels={[item.provinceName]}
														defaultMessage={[
															`${t("screen.verificationIntro")} ${item.park?.name[locale] ?? item.name}`,
															...verificationFields(
																item.missing,
																item.park,
															).map(
																(field) => `- ${t(`screen.question.${field}`)}`,
															),
														].join("\n")}
													/>
												</details>
											)}
										</li>
									))}
								</ol>
							) : (
								<p>{t("district.empty")}</p>
							)}
						</div>
					))}
					<button
						type="button"
						disabled={ids.length < 2}
						onClick={() =>
							onCompare(
								submitted.sector === "electronics"
									? "manufacturing"
									: submitted.sector,
								ids,
							)
						}
					>
						{t("screen.compare")}
					</button>
				</div>
			)}
		</section>
	);
}
