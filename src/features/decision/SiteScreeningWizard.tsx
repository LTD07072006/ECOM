"use client";

import { useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import type { Profile } from "../geography/types";
import { curatedProvinceMicroLocations } from "../map/province-detail-locations";
import { getProvinceDistricts } from "../map/province-districts";
import { catchmentFacilities } from "../map/proximity";
import { sectorScenarios, type SectorId } from "./model";
import {
	screenLocations,
	type InfrastructurePriority,
	type ScreeningInput,
} from "./site-screening";

export function SiteScreeningWizard({
	provinces,
	onCompare,
}: {
	provinces: Profile[];
	onCompare: (sector: SectorId, ids: string[]) => void;
}) {
	const { t, locale } = useI18n();
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
				getProvinceDistricts(province, []).map((district) => {
					const facilities =
						district.longitude === null || district.latitude === null
							? []
							: catchmentFacilities([district.longitude, district.latitude]);
					const infrastructure = facilities.flatMap(
						({ code, kind }): InfrastructurePriority[] =>
							kind === "airport"
								? ["international_airport"]
								: kind === "expressway_node"
									? ["expressway"]
									: kind === "seaport" && code !== "VNVCA-CP"
										? ["deep_port"]
										: [],
					);
					const areas = curatedProvinceMicroLocations
						.filter((site) => district.linkedMicroLocationIds.includes(site.id))
						.flatMap((site) =>
							site.utilitySpecs?.availableLandHa == null
								? []
								: [site.utilitySpecs.availableLandHa * 10000],
						);
					return {
						id: district.id,
						provinceId: province.id,
						name: `${district.name[locale]} · ${province.displayName}`,
						sectors: district.recommendedSectors.map(({ sector }) => sector),
						availableAreaM2: areas.length ? Math.max(...areas) : null,
						wageRegion: null,
						infrastructure: infrastructure.includes(
							submitted.infrastructure as InfrastructurePriority,
						)
							? infrastructure
							: null,
					};
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
											<strong>{item.name}</strong>
											<p>
												{item.reasons
													.map((reason) => t(`screen.${reason}`))
													.join(" · ")}
												{item.missing.length > 0 &&
													` — ${t("district.missing")}: ${item.missing.map((reason) => t(`screen.${reason}`)).join(" · ")}`}
											</p>
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
