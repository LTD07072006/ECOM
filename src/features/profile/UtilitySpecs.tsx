"use client";

import { useI18n } from "../../lib/i18n/provider";
import {
	utilityKeys,
	type ProvinceMicroLocation,
} from "../map/province-detail-locations";

export function UtilitySpecs({
	location,
}: {
	location: ProvinceMicroLocation;
}) {
	const { t, formatNumber } = useI18n();
	if (location.category !== "industrial_zone") return null;
	return (
		<div>
			<strong>{t("site.specs")}</strong>
			<dl className="site-specs">
				{utilityKeys.map((key) => {
					const value = location.utilitySpecs?.[key];
					return (
						<div key={key}>
							<dt>{t(`site.${key}`)}</dt>
							<dd>
								{typeof value === "number"
									? formatNumber(value)
									: (value ?? t("district.missing"))}
							</dd>
						</div>
					);
				})}
			</dl>
		</div>
	);
}
