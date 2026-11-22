"use client";

import { useState, type FormEvent } from "react";
import type { ReleaseAction, ReleaseOverview, ReleaseRole } from "./operations";
import { useI18n } from "../../lib/i18n/provider";
import type { MessageKey } from "../../lib/i18n";

const actionKeys: Record<ReleaseAction, MessageKey> = {
	approve: "release.approve",
	publish: "release.publish",
	retire: "release.retire",
};
const batchActionKeys: Record<ReleaseAction, MessageKey> = {
	approve: "release.approveBatch",
	publish: "release.publishBatch",
	retire: "release.retireBatch",
};

function DatasetEvidence({
	dataset,
}: {
	dataset: ReleaseOverview["datasets"][number];
}) {
	const { t } = useI18n();
	const evidence =
		[...dataset.methods, ...dataset.limitations].join(" ") ||
		(dataset.boundaries > 0
			? t("release.evidenceBoundaries")
			: dataset.points > 0
				? t("release.evidencePoints")
				: dataset.units > 0
					? t("release.evidenceUnits")
					: t("release.evidenceFallback"));
	return (
		<details className="release-dataset">
			<summary>
				<strong>{dataset.code}</strong> · {dataset.version} · {dataset.status}
				{dataset.stale ? ` · ${t("release.reviewOverdueShort")}` : ""}
				{dataset.source_status !== "active"
					? ` · ${t("release.sourceStatus", { status: dataset.source_status })}`
					: ""}
			</summary>
			<dl>
				<dt>{t("release.publisher")}</dt>
				<dd>{dataset.publisher}</dd>
				<dt>{t("release.citation")}</dt>
				<dd>
					{dataset.url ? (
						<a href={dataset.url}>{dataset.citation}</a>
					) : (
						dataset.citation
					)}
				</dd>
				<dt>{t("release.licenseAccess")}</dt>
				<dd>
					{dataset.license} · {dataset.access}
				</dd>
				<dt>{t("release.owner")}</dt>
				<dd>{dataset.owner ?? t("release.unassigned")}</dd>
				<dt>{t("release.datesLabel")}</dt>
				<dd>
					{t("release.dates", {
						asOf: dataset.as_of ?? "—",
						reviewed: dataset.reviewed ?? "—",
						due: dataset.due ?? "—",
					})}
				</dd>
				<dt>{t("release.geographyCoverage")}</dt>
				<dd>
					{t("release.coverage", {
						geographies:
							dataset.geographies.join(", ") || t("common.unavailable"),
						covered: dataset.covered_provinces,
						expected: dataset.expected_provinces,
						communes: dataset.communes,
					})}
				</dd>
				<dt>{t("release.recordsLabel")}</dt>
				<dd>
					{t("release.records", {
						units: dataset.units,
						boundaries: dataset.boundaries,
						points: dataset.points,
						observations: dataset.observations,
						missing: dataset.missing,
					})}
				</dd>
				<dt>{t("release.period")}</dt>
				<dd>{dataset.periods.join("; ") || t("release.periodFallback")}</dd>
				<dt>{t("release.methodLimitations")}</dt>
				<dd>{evidence}</dd>
				<dt>{t("release.validationLabel")}</dt>
				<dd>
					{t("release.validation", {
						geometry: dataset.invalid_geometry,
						observations: dataset.invalid_observations,
					})}
				</dd>
				<dt>SHA-256</dt>
				<dd>
					<code>{dataset.checksum ?? t("common.unavailable")}</code>
				</dd>
			</dl>
		</details>
	);
}

export function ReleaseDashboard() {
	const { t } = useI18n();
	const [token, setToken] = useState("");
	const [result, setResult] = useState<{
		role: ReleaseRole;
		actor?: string;
		data: ReleaseOverview;
	}>();
	const [busy, setBusy] = useState(false);
	const [status, setStatus] = useState("");
	const [problem, setProblem] = useState("");
	const [batchId, setBatchId] = useState<string>();
	const [action, setAction] = useState<ReleaseAction>();

	async function request(body?: string) {
		setBusy(true);
		setProblem("");
		setStatus(body ? t("release.savingAction") : t("release.loadingOverview"));
		const url = "/api/internal/releases";
		const headers = {
			Authorization: `Bearer ${token}`,
			...(body && { "Content-Type": "application/json" }),
		};
		try {
			if (body) {
				const response = await fetch(url, { method: "POST", headers, body });
				if (!response.ok) throw new Error((await response.json()).error);
				setAction(undefined);
			}
			const response = await fetch(url, { headers, cache: "no-store" });
			if (response.status === 401) setResult(undefined);
			if (!response.ok) throw new Error((await response.json()).error);
			setResult(await response.json());
			setStatus(
				body ? t("release.actionRecorded") : t("release.overviewLoaded"),
			);
		} catch (error) {
			setStatus("");
			setProblem(
				error instanceof Error
					? error.message
					: t("release.serviceUnavailable"),
			);
		} finally {
			setBusy(false);
		}
	}

	function submitAction(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const note = new FormData(event.currentTarget).get("note");
		void request(JSON.stringify({ batchId, action, note }));
	}

	return (
		<main className="release-shell">
			<a href="/">{t("common.marketWorkspace")}</a>
			<h1>{t("release.title")}</h1>
			{result ? (
				<div className="release-toolbar">
					<p>
						{t("release.signedInAs")}{" "}
						<strong>{result.actor ?? result.role}</strong> · {result.role}
					</p>
					<button type="button" disabled={busy} onClick={() => void request()}>
						{t("release.refresh")}
					</button>
					<button
						type="button"
						disabled={busy}
						onClick={() => {
							setResult(undefined);
							setToken("");
							setStatus(t("release.signedOut"));
							setProblem("");
							setBatchId(undefined);
							setAction(undefined);
						}}
					>
						{t("release.signOut")}
					</button>
				</div>
			) : (
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void request();
					}}
				>
					<label htmlFor="release-token">{t("release.token")}</label>
					<input
						id="release-token"
						type="password"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						autoComplete="off"
						required
						minLength={43}
						maxLength={128}
						disabled={busy}
					/>
					<button type="submit" disabled={busy}>
						{t("release.open")}
					</button>
				</form>
			)}
			<p role="status">{status}</p>
			{problem && (
				<p className="release-error" role="alert">
					{problem}
				</p>
			)}
			{result && (
				<>
					<h2>{t("release.freshness")}</h2>
					<dl className="release-metrics">
						<div>
							<dt>{t("release.publishedDatasets")}</dt>
							<dd>{result.data.freshness.publishedDatasets}</dd>
						</div>
						<div>
							<dt>{t("release.reviewOverdue")}</dt>
							<dd>{result.data.freshness.reviewDue}</dd>
						</div>
						<div>
							<dt>{t("release.sourcesDue")}</dt>
							<dd>{result.data.freshness.staleSources}</dd>
						</div>
						<div>
							<dt>{t("release.revoked")}</dt>
							<dd>{result.data.freshness.revokedSources}</dd>
						</div>
						<div>
							<dt>{t("release.restrictions")}</dt>
							<dd>{result.data.freshness.blockedDatasets}</dd>
						</div>
						<div>
							<dt>{t("release.invalidGeometry")}</dt>
							<dd>{result.data.freshness.invalidGeometry}</dd>
						</div>
					</dl>
					<h2>{t("release.queue")}</h2>
					{result.data.batches.length === 0 && (
						<p>{t("release.stagePrompt")}</p>
					)}
					{result.data.batches.map((batch) => {
						const available =
							result.role === "reviewer"
								? batch.staged && !batch.approved && !batch.blockers.length
									? "approve"
									: null
								: batch.staged && batch.approved && !batch.blockers.length
									? "publish"
									: batch.kind === "wave2" && batch.published && !batch.retired
										? "retire"
										: null;
						return (
							<section className="release-batch" key={batch.id}>
								<h3>
									{batch.kind === "foundation"
										? t("release.foundation")
										: t("release.wave2")}{" "}
									· {batch.geography}
								</h3>
								<p>
									{t("release.manifestSha")} <code>{batch.fingerprint}</code>
								</p>
								{batch.staged && batch.blockers.length > 0 && (
									<ul>
										{batch.blockers.map((blocker) => (
											<li key={blocker}>{blocker}</li>
										))}
									</ul>
								)}
								{result.data.datasets
									.filter((dataset) => dataset.batch_id === batch.id)
									.map((dataset) => (
										<DatasetEvidence
											key={dataset.dataset_version_id}
											dataset={dataset}
										/>
									))}
								<details>
									<summary>{t("release.auditHistory")}</summary>
									<ol>
										{batch.audit.map((entry) => (
											<li key={entry.action}>
												{entry.action} · {entry.actor} ·{" "}
												<time dateTime={entry.at}>
													{new Date(entry.at).toLocaleString()}
												</time>
												{entry.note && ` · ${entry.note}`}
											</li>
										))}
									</ol>
								</details>
								{available &&
									(batch.id === batchId && action ? (
										<form onSubmit={submitAction}>
											<label htmlFor="release-note">
												{t("release.reviewNote")}
											</label>
											<textarea
												id="release-note"
												name="note"
												required
												minLength={10}
												maxLength={500}
												// biome-ignore lint/a11y/noAutofocus: the review note is the only field in the confirmation form the user just opened
												autoFocus
											/>
											<button type="submit" disabled={busy}>
												{t("release.confirm", {
													action: t(actionKeys[action]),
												})}
											</button>
											<button
												type="button"
												disabled={busy}
												onClick={() => setAction(undefined)}
											>
												{t("common.cancel")}
											</button>
										</form>
									) : (
										<button
											type="button"
											disabled={busy}
											onClick={() => {
												setBatchId(batch.id);
												setAction(available);
											}}
										>
											{t(batchActionKeys[available])}
										</button>
									))}
							</section>
						);
					})}
					<h2>{t("release.outsideQueue")}</h2>
					{result.data.datasets.every((dataset) => dataset.batch_id) && (
						<p>{t("release.noUnregistered")}</p>
					)}
					{result.data.datasets
						.filter((dataset) => !dataset.batch_id)
						.map((dataset) => (
							<DatasetEvidence
								key={dataset.dataset_version_id}
								dataset={dataset}
							/>
						))}
				</>
			)}
		</main>
	);
}
