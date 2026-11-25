"use client";

import { useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import type { RoadEstimate } from "./road-connectivity";

export function RoadConnectivity({ siteId }: { siteId: string }) {
	const { t, formatNumber } = useI18n();
	const [facility, setFacility] = useState("HPH");
	const [result, setResult] = useState<RoadEstimate | null>();
	const [pending, setPending] = useState(false);
	async function load() {
		setPending(true);
		try {
			const params = new URLSearchParams({ site: siteId, facility });
			const response = await fetch(`/api/map/road-route?${params}`, {
				signal: AbortSignal.timeout(7000),
			});
			setResult(response.ok ? (await response.json()).data : null);
		} catch {
			setResult(null);
		} finally {
			setPending(false);
		}
	}
	return (
		<div className="layer-filter">
			<p>{t("road.scope")}</p>
			<label>
				{t("road.destination")}
				<select
					value={facility}
					disabled={pending}
					onChange={(event) => {
						setFacility(event.target.value);
						setResult(undefined);
					}}
				>
					<option value="HPH">{t("road.hph")}</option>
					<option value="VNHPH-LH">{t("road.lh")}</option>
				</select>
			</label>
			<button type="button" disabled={pending} onClick={() => void load()}>
				{t("road.check")}
			</button>
			<div role="status">
				{pending
					? t("road.loading")
					: result === null
						? t("district.missing")
						: result && (
								<p>
									<a href={result.sourceUrl}>{t(`road.${result.mode}`)}</a>
									{" · "}
									{result.observedOn}
									{" · "}
									{t("road.metrics", {
										km: formatNumber(
											Math.round(result.distanceMeters / 100) / 10,
										),
										minutes: formatNumber(
											Math.round(result.durationSeconds / 60),
										),
									})}
								</p>
							)}
			</div>
		</div>
	);
}
