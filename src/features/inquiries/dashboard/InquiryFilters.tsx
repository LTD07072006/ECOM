"use client";

import { useI18n } from "../../../lib/i18n/provider";
import { levelLabel } from "../../../lib/i18n/data-labels";
import { statusOptions, type GeographyOption } from "./types";

type Props = {
	busy: boolean;
	status: string;
	country: string;
	sector: string;
	from: string;
	to: string;
	geographyQuery: string;
	geographyOptions: GeographyOption[];
	geographies: GeographyOption[];
	onStatusChange: (value: string) => void;
	onCountryChange: (value: string) => void;
	onSectorChange: (value: string) => void;
	onFromChange: (value: string) => void;
	onToChange: (value: string) => void;
	onGeographyQueryChange: (value: string) => void;
	onSearchGeographies: () => void;
	onAddGeography: (option: GeographyOption) => void;
	onRemoveGeography: (id: string) => void;
};

export function InquiryFilters({
	busy,
	status,
	country,
	sector,
	from,
	to,
	geographyQuery,
	geographyOptions,
	geographies,
	onStatusChange,
	onCountryChange,
	onSectorChange,
	onFromChange,
	onToChange,
	onGeographyQueryChange,
	onSearchGeographies,
	onAddGeography,
	onRemoveGeography,
}: Props) {
	const { t, locale } = useI18n();

	return (
		<fieldset className="inquiry-dashboard-filters">
			<legend>{t("admin.filters")}</legend>
			<label className="form-field">
				{t("admin.status")}
				<select
					className="control-select"
					value={status}
					disabled={busy}
					onChange={(event) => onStatusChange(event.target.value)}
				>
					<option value="">{t("admin.all")}</option>
					{statusOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{t(option.key)}
						</option>
					))}
				</select>
			</label>
			<label className="form-field">
				{t("admin.country")}
				<input
					className="control-input"
					value={country}
					disabled={busy}
					onChange={(event) => onCountryChange(event.target.value)}
				/>
			</label>
			<label className="form-field">
				{t("admin.sector")}
				<input
					className="control-input"
					value={sector}
					disabled={busy}
					onChange={(event) => onSectorChange(event.target.value)}
				/>
			</label>
			<label className="form-field">
				{t("admin.from")}
				<input
					className="control-input"
					type="date"
					value={from}
					disabled={busy}
					onChange={(event) => onFromChange(event.target.value)}
				/>
			</label>
			<label className="form-field">
				{t("admin.to")}
				<input
					className="control-input"
					type="date"
					value={to}
					disabled={busy}
					onChange={(event) => onToChange(event.target.value)}
				/>
			</label>
			<form
				className="inquiry-geography-picker"
				onSubmit={(event) => {
					event.preventDefault();
					onSearchGeographies();
				}}
			>
				<label className="form-field">
					{t("admin.searchGeography")}
					<input
						className="control-input"
						value={geographyQuery}
						disabled={busy}
						placeholder={t("admin.geographyPlaceholder")}
						onChange={(event) => onGeographyQueryChange(event.target.value)}
					/>
				</label>
				<button
					type="submit"
					className="btn btn-secondary"
					disabled={busy || geographyQuery.trim().length < 2}
				>
					{t("admin.findGeography")}
				</button>
				{geographyOptions.length > 0 && (
					<ul aria-label={t("admin.resultsAria")}>
						{geographyOptions.map((option) => (
							<li key={option.id}>
								<button
									type="button"
									className="btn btn-secondary btn-sm"
									disabled={
										busy || geographies.some(({ id }) => option.id === id)
									}
									onClick={() => onAddGeography(option)}
								>
									{option.displayName || option.name} ·{" "}
									{levelLabel(locale, option.level)} ({option.code})
								</button>
							</li>
						))}
					</ul>
				)}
				{geographies.length > 0 && (
					<ul
						className="inquiry-geography-selected"
						aria-label={t("admin.selectedAria")}
					>
						{geographies.map((option) => (
							<li key={option.id}>
								<button
									type="button"
									className="btn btn-secondary btn-sm"
									disabled={busy}
									aria-label={t("admin.removeGeography", {
										name: option.displayName || option.name,
									})}
									onClick={() => onRemoveGeography(option.id)}
								>
									{option.displayName || option.name} ×
								</button>
							</li>
						))}
					</ul>
				)}
			</form>
		</fieldset>
	);
}
