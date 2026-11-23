"use client";

import { useEffect, useState } from "react";
import {
	VIETNAM_REPORT_TIME_ZONE,
	vietnamCalendarDay,
	vietnamDateRange,
} from "./reporting";
import { useI18n } from "../../lib/i18n/provider";
import { InquiryDetailDrawer } from "./dashboard/InquiryDetailDrawer";
import { InquiryFilters } from "./dashboard/InquiryFilters";
import { InquiryList } from "./dashboard/InquiryList";
import { ReportingWorkspace } from "./dashboard/ReportingWorkspace";
import { SnapshotCompare } from "./dashboard/SnapshotCompare";
import { SnapshotHistory } from "./dashboard/SnapshotHistory";
import {
	saveCsv,
	type GeographyOption,
	type InquiryDetail,
	type InquiryMetrics,
	type InquiryPagination,
	type InquiryRow,
	type OperatorSession,
	type SnapshotComparison,
	type SnapshotRecord,
} from "./dashboard/types";

export function InquiryDashboard() {
	const { t } = useI18n();
	const [token, setToken] = useState("");
	const [session, setSession] = useState<OperatorSession | null>(null);
	const [activeTab, setActiveTab] = useState<"inquiries" | "reports">(
		"inquiries",
	);
	const [rows, setRows] = useState<InquiryRow[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState("");
	const [country, setCountry] = useState("");
	const [sector, setSector] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [geographies, setGeographies] = useState<GeographyOption[]>([]);
	const [geographyNames, setGeographyNames] = useState<Record<string, string>>(
		{},
	);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(25);
	const [pagination, setPagination] = useState<InquiryPagination | null>(null);
	const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
	const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);
	const [preview, setPreview] = useState<{ key: string; total: number } | null>(
		null,
	);
	const [selectedSnapshot, setSelectedSnapshot] =
		useState<SnapshotRecord | null>(null);
	const [compareId, setCompareId] = useState("");
	const [correctionId, setCorrectionId] = useState("");
	const [comparison, setComparison] = useState<SnapshotComparison | null>(null);
	const [geographyQuery, setGeographyQuery] = useState("");
	const [geographyOptions, setGeographyOptions] = useState<GeographyOption[]>(
		[],
	);
	const [selected, setSelected] = useState<InquiryDetail | null>(null);
	const [note, setNote] = useState("");
	const [nextStatus, setNextStatus] = useState("");
	const [closeReason, setCloseReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState("");
	const [metrics, setMetrics] = useState<InquiryMetrics | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		fetch("/api/internal/session", {
			cache: "no-store",
			credentials: "same-origin",
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) return;
				const body = (await response.json().catch(() => null)) as {
					authenticated?: boolean;
					actor?: string;
					role?: "steward" | "reviewer";
				} | null;
				if (
					!controller.signal.aborted &&
					body?.authenticated &&
					body.actor &&
					body.role
				) {
					setSession({ actor: body.actor, role: body.role });
				}
			})
			.catch(() => {});
		return () => controller.abort();
	}, []);

	const canAuthenticate = Boolean(token || session?.role === "steward");
	const [now] = useState(() => new Date());
	const dateRange = vietnamDateRange(from, to);
	const reportRange = vietnamDateRange(
		from || vietnamCalendarDay(now, 6),
		to || vietnamCalendarDay(now),
	);
	const snapshotInput = {
		periodStart: reportRange.from ?? "",
		periodEnd: reportRange.to ?? "",
		timeZone: VIETNAM_REPORT_TIME_ZONE,
		filters: {
			status: status || undefined,
			country: country.trim() || undefined,
			sector: sector.trim() || undefined,
			geographyIds: geographies.length
				? geographies.map(({ id }) => id)
				: undefined,
		},
		correctsSnapshotId: correctionId || undefined,
	};
	const previewKey = JSON.stringify(snapshotInput);
	const currentPreview = preview?.key === previewKey ? preview : null;
	const validPeriod = Boolean(
		snapshotInput.periodStart &&
			snapshotInput.periodEnd &&
			snapshotInput.periodStart < snapshotInput.periodEnd,
	);
	const statusChanged =
		selected !== null && nextStatus !== selected.inquiry.status;
	const needsCloseReason = statusChanged && nextStatus === "closed";
	const canSave = Boolean(
		(statusChanged || note.trim()) && (!needsCloseReason || closeReason),
	);

	function authHeaders(jsonBody = false): HeadersInit {
		return {
			...(token ? { authorization: `Bearer ${token}` } : {}),
			...(jsonBody ? { "content-type": "application/json" } : {}),
		};
	}

	async function request<T>(
		path: string,
		fallback: string,
		body?: object,
	): Promise<T> {
		const response = await fetch(path, {
			cache: "no-store",
			credentials: "same-origin",
			headers: authHeaders(Boolean(body)),
			...(body && { method: "PATCH", body: JSON.stringify(body) }),
		});
		const result = (await response.json().catch(() => null)) as
			| (T & { error?: string })
			| null;
		if (!response.ok || !result) throw new Error(result?.error ?? fallback);
		return result;
	}

	function filterParams(includePage = true) {
		const params = new URLSearchParams();
		if (status) params.set("status", status);
		if (country) params.set("country", country);
		if (sector) params.set("sector", sector);
		if (dateRange.from) params.set("from", dateRange.from);
		if (dateRange.to) params.set("to", dateRange.to);
		if (geographies.length)
			params.set("geographyIds", geographies.map(({ id }) => id).join(","));
		if (includePage) {
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
		}
		return params;
	}

	async function fetchRows() {
		const body = await request<{
			data: InquiryRow[];
			metrics: InquiryMetrics;
			pagination: InquiryPagination;
		}>(`/api/internal/inquiries?${filterParams()}`, t("admin.error.load"));
		setMetrics(body.metrics);
		setPagination(body.pagination);
		return body.data;
	}

	async function fetchDetail(referenceCode: string) {
		const body = await request<{ data: InquiryDetail }>(
			`/api/internal/inquiries/${referenceCode}`,
			t("admin.error.detail"),
		);
		return body.data;
	}

	function showDetail(detail: InquiryDetail | null) {
		setSelected(detail);
		setNextStatus(detail?.inquiry.status ?? "");
		setCloseReason("");
		setNote("");
	}

	function resetDashboardState() {
		setRows([]);
		showDetail(null);
		setMetrics(null);
		setPagination(null);
		setSnapshots([]);
		setSnapshotsLoaded(false);
		setSelectedSnapshot(null);
		setCompareId("");
		setComparison(null);
		setCorrectionId("");
		setPreview(null);
		setError(null);
		setNotice("");
	}

	async function run(label: string, task: () => Promise<void>) {
		if (busy) return;
		setBusy(true);
		setError(null);
		setNotice(label);
		try {
			await task();
		} catch (cause) {
			setNotice("");
			setError(
				cause instanceof Error ? cause.message : t("admin.error.generic"),
			);
		} finally {
			setBusy(false);
		}
	}

	function signInSession() {
		if (!token.trim()) return;
		void run(t("admin.notice.loading"), async () => {
			const response = await fetch("/api/internal/session", {
				method: "POST",
				cache: "no-store",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token: token.trim() }),
			});
			const body = (await response.json().catch(() => null)) as {
				authenticated?: boolean;
				actor?: string;
				role?: "steward" | "reviewer";
				error?: string;
			} | null;
			if (!response.ok || !body?.authenticated || !body.actor || !body.role) {
				throw new Error(body?.error ?? t("admin.sessionFailed"));
			}
			setSession({ actor: body.actor, role: body.role });
			setToken("");
			setNotice(t("admin.sessionSignedIn"));
		});
	}

	function signOutSession() {
		void run(t("admin.notice.loading"), async () => {
			await fetch("/api/internal/session", {
				method: "DELETE",
				cache: "no-store",
				credentials: "same-origin",
			});
			setSession(null);
			setToken("");
			resetDashboardState();
			setNotice(t("admin.sessionSignedOut"));
		});
	}

	function load() {
		void run(t("admin.notice.loading"), async () => {
			const loaded = await fetchRows();
			setRows(loaded);
			showDetail(null);
			setNotice(
				loaded.length ? t("admin.notice.loaded") : t("admin.notice.none"),
			);
		});
	}

	function changePage(nextPage: number) {
		setPage(nextPage);
		void run(t("admin.notice.loading"), async () => {
			const params = filterParams(false);
			params.set("page", String(nextPage));
			params.set("pageSize", String(pageSize));
			const body = await request<{
				data: InquiryRow[];
				metrics: InquiryMetrics;
				pagination: InquiryPagination;
			}>(`/api/internal/inquiries?${params}`, t("admin.error.load"));
			setRows(body.data);
			setMetrics(body.metrics);
			setPagination(body.pagination);
			showDetail(null);
			setNotice(t("admin.notice.loaded"));
		});
	}

	function downloadCsv() {
		const params = filterParams(false);
		void run(t("admin.notice.csvPreparing"), async () => {
			const response = await fetch(
				`/api/internal/inquiries?${params}&format=csv`,
				{
					credentials: "same-origin",
					headers: authHeaders(false),
				},
			);
			if (!response.ok) throw new Error(t("admin.error.export"));
			saveCsv(await response.blob(), "investor-inquiries.csv");
			setNotice(t("admin.notice.csvExported"));
		});
	}

	async function loadSnapshots() {
		const body = await request<{ data: SnapshotRecord[] }>(
			"/api/internal/inquiries/snapshots",
			t("reports.error.history"),
		);
		setSnapshots(body.data);
		setSnapshotsLoaded(true);
	}

	function prepareSnapshot(previewOnly: boolean) {
		if (!validPeriod || (!previewOnly && !currentPreview)) return;
		void run(
			previewOnly
				? t("reports.notice.calculating")
				: t("reports.notice.saving"),
			async () => {
				const response = await fetch("/api/internal/inquiries/snapshots", {
					method: "POST",
					credentials: "same-origin",
					headers: authHeaders(true),
					body: JSON.stringify({ ...snapshotInput, preview: previewOnly }),
				});
				const body = (await response.json().catch(() => null)) as {
					data?: { total: number } & SnapshotRecord;
					error?: string;
				} | null;
				if (!response.ok || !body?.data)
					throw new Error(
						body?.error ??
							(body ? t("reports.error.prepare") : t("admin.error.generic")),
					);
				if (previewOnly) {
					setPreview({ key: previewKey, total: body.data.total });
					setNotice(t("reports.notice.calculated"));
					return;
				}
				setCorrectionId("");
				setPreview(null);
				setNotice(
					body.data.metrics.total === currentPreview?.total
						? t("reports.notice.saved")
						: t("reports.notice.savedChanged", {
								count: body.data.metrics.total,
							}),
				);
				try {
					await loadSnapshots();
				} catch {
					setNotice(t("reports.notice.savedReload"));
				}
			},
		);
	}

	function refreshHistory() {
		void run(t("reports.notice.loadingHistory"), async () => {
			await loadSnapshots();
			setNotice("");
		});
	}

	function openSnapshot(snapshotId: string) {
		void run(t("reports.notice.snapshotLoading"), async () => {
			const body = await request<{ data: SnapshotRecord }>(
				`/api/internal/inquiries/snapshots/${snapshotId}`,
				t("reports.error.snapshot"),
			);
			setSelectedSnapshot(body.data);
			if (body.data.geography_names)
				setGeographyNames((previous) => ({
					...previous,
					...body.data.geography_names,
				}));
			setCompareId("");
			setComparison(null);
			setNotice(t("reports.notice.snapshotLoaded"));
		});
	}

	function exportSnapshot(snapshotId: string) {
		void run(t("reports.notice.exportPreparing"), async () => {
			const response = await fetch("/api/internal/inquiries/snapshots/export", {
				method: "POST",
				cache: "no-store",
				credentials: "same-origin",
				headers: {
					...(token ? { authorization: `Bearer ${token}` } : {}),
					"content-type": "application/json",
				},
				body: JSON.stringify({ id: snapshotId }),
			});
			if (!response.ok) throw new Error(t("reports.error.export"));
			saveCsv(await response.blob(), `inquiry-snapshot-${snapshotId}.csv`);
			setNotice(t("reports.notice.exported"));
		});
	}

	function compareSnapshot() {
		if (!selectedSnapshot || !compareId) return;
		void run(t("reports.notice.comparing"), async () => {
			const response = await fetch(
				"/api/internal/inquiries/snapshots/compare",
				{
					method: "POST",
					cache: "no-store",
					credentials: "same-origin",
					headers: authHeaders(true),
					body: JSON.stringify({
						left: selectedSnapshot.snapshot_id,
						right: compareId,
					}),
				},
			);
			const body = (await response.json().catch(() => null)) as {
				data?: SnapshotComparison;
				error?: string;
			} | null;
			if (!response.ok) {
				if (response.status === 409 && body?.data) {
					setComparison(body.data);
					setNotice(t("reports.notice.different"));
					return;
				}
				throw new Error(body?.error ?? t("reports.error.compare"));
			}
			if (!body?.data) throw new Error(t("reports.error.compare"));
			setComparison(body.data);
			setNotice(
				t("reports.notice.compared", {
					delta: `${body.data.delta.total >= 0 ? "+" : ""}${body.data.delta.total}`,
				}),
			);
		});
	}

	function searchGeographies() {
		if (geographyQuery.trim().length < 2) return;
		void run(t("admin.notice.searching"), async () => {
			const response = await fetch(
				`/api/geographies?q=${encodeURIComponent(geographyQuery.trim())}`,
			);
			const body = (await response.json().catch(() => null)) as {
				data?: GeographyOption[];
				error?: string;
			} | null;
			if (!response.ok || !body)
				throw new Error(
					body?.error ??
						(body ? t("admin.error.search") : t("admin.error.generic")),
				);
			setGeographyOptions(body.data ?? []);
			setNotice(body.data?.length ? "" : t("admin.notice.geographyNone"));
		});
	}

	function addGeography(option: GeographyOption) {
		setGeographies((previous) =>
			previous.some(({ id }) => id === option.id)
				? previous
				: [...previous, option],
		);
		setGeographyNames((previous) => ({
			...previous,
			[option.id]: option.displayName || option.name,
		}));
		setPage(1);
	}

	function createCorrection() {
		if (!selectedSnapshot) return;
		setCorrectionId(selectedSnapshot.snapshot_id);
		setNotice(t("reports.notice.correctionReady"));
	}

	function openDetail(referenceCode: string) {
		void run(t("admin.notice.loadingDetail"), async () => {
			showDetail(await fetchDetail(referenceCode));
			setNotice("");
		});
	}

	function update() {
		if (!selected || !canSave) return;
		const referenceCode = selected.inquiry.reference_code;
		const payload = {
			status: statusChanged ? nextStatus : undefined,
			closeReason: needsCloseReason ? closeReason : undefined,
			note: note.trim() || undefined,
		};
		void run(t("admin.notice.saving"), async () => {
			await request(
				`/api/internal/inquiries/${referenceCode}`,
				t("admin.error.update"),
				payload,
			);
			try {
				const [detail, refreshed] = await Promise.all([
					fetchDetail(referenceCode),
					fetchRows(),
				]);
				showDetail(detail);
				setRows(refreshed);
				setNotice(t("admin.notice.saved"));
			} catch {
				showDetail(null);
				setRows([]);
				throw new Error(t("admin.notice.stale"));
			}
		});
	}

	function handleTokenChange(value: string) {
		setToken(value);
		resetDashboardState();
	}

	const chartMetrics = selectedSnapshot?.metrics ?? metrics;

	return (
		<section className="inquiry-dashboard">
			<p>{t("admin.accessNote")}</p>
			<nav className="inquiry-dashboard-tabs" aria-label={t("admin.tabsAria")}>
				<button
					type="button"
					disabled={busy}
					aria-pressed={activeTab === "inquiries"}
					onClick={() => setActiveTab("inquiries")}
				>
					{t("admin.inquiries")}
				</button>
				<button
					type="button"
					disabled={busy}
					aria-pressed={activeTab === "reports"}
					onClick={() => {
						setActiveTab("reports");
						if (canAuthenticate && !snapshotsLoaded) refreshHistory();
					}}
				>
					{t("admin.reports")}
				</button>
			</nav>

			<div className="session-bar">
				{session ? (
					<>
						<span>
							{t("admin.sessionActive", {
								actor: session.actor,
								role: session.role,
							})}
						</span>
						<button type="button" disabled={busy} onClick={signOutSession}>
							{t("admin.sessionSignOut")}
						</button>
						{session.role !== "steward" && (
							<p role="alert">
								{t("admin.sessionRoleMismatch", { role: session.role })}
							</p>
						)}
					</>
				) : (
					<>
						<label>
							{t("admin.token")}
							<input
								type="password"
								value={token}
								disabled={busy}
								onChange={(event) => handleTokenChange(event.target.value)}
								autoComplete="off"
							/>
						</label>
						<button
							type="button"
							disabled={busy || !token.trim()}
							onClick={signInSession}
						>
							{t("admin.sessionSignIn")}
						</button>
					</>
				)}
			</div>

			<InquiryFilters
				busy={busy}
				status={status}
				country={country}
				sector={sector}
				from={from}
				to={to}
				geographyQuery={geographyQuery}
				geographyOptions={geographyOptions}
				geographies={geographies}
				onStatusChange={(value) => {
					setStatus(value);
					setPage(1);
				}}
				onCountryChange={(value) => {
					setCountry(value);
					setPage(1);
				}}
				onSectorChange={(value) => {
					setSector(value);
					setPage(1);
				}}
				onFromChange={(value) => {
					setFrom(value);
					setPage(1);
				}}
				onToChange={(value) => {
					setTo(value);
					setPage(1);
				}}
				onGeographyQueryChange={(value) => {
					setGeographyQuery(value);
					setGeographyOptions([]);
				}}
				onSearchGeographies={searchGeographies}
				onAddGeography={addGeography}
				onRemoveGeography={(id) => {
					setGeographies((prev) => prev.filter((item) => item.id !== id));
					setPage(1);
				}}
			/>

			<p role="status">{notice}</p>
			{error && <p role="alert">{error}</p>}

			{activeTab === "inquiries" && (
				<>
					<InquiryList
						busy={busy}
						canAuthenticate={canAuthenticate}
						pageSize={pageSize}
						rows={rows}
						metrics={metrics}
						pagination={pagination}
						onPageSizeChange={(size) => {
							setPageSize(size);
							setPage(1);
						}}
						onLoad={load}
						onDownloadCsv={downloadCsv}
						onOpenDetail={openDetail}
						onChangePage={changePage}
					/>
					{selected && (
						<InquiryDetailDrawer
							selected={selected}
							busy={busy}
							nextStatus={nextStatus}
							closeReason={closeReason}
							note={note}
							needsCloseReason={needsCloseReason}
							canSave={canSave}
							onNextStatusChange={setNextStatus}
							onCloseReasonChange={setCloseReason}
							onNoteChange={setNote}
							onSave={update}
						/>
					)}
				</>
			)}

			{activeTab === "reports" && (
				<section className="inquiry-reports" aria-label={t("admin.reports")}>
					<ReportingWorkspace
						busy={busy}
						canAuthenticate={canAuthenticate}
						validPeriod={validPeriod}
						snapshotInput={snapshotInput}
						currentPreview={currentPreview}
						correctionId={correctionId}
						geographyNames={geographyNames}
						chartMetrics={chartMetrics}
						onCancelCorrection={() => setCorrectionId("")}
						onPrepareSnapshot={prepareSnapshot}
					/>
					<SnapshotHistory
						busy={busy}
						canAuthenticate={canAuthenticate}
						snapshots={snapshots}
						snapshotsLoaded={snapshotsLoaded}
						selectedSnapshot={selectedSnapshot}
						compareId={compareId}
						geographyNames={geographyNames}
						onRefreshHistory={refreshHistory}
						onOpenSnapshot={openSnapshot}
						onExportSnapshot={exportSnapshot}
						onCreateCorrection={createCorrection}
						onCompareIdChange={(id) => {
							setCompareId(id);
							setComparison(null);
						}}
						onCompareSnapshot={compareSnapshot}
					/>
					{comparison && (
						<SnapshotCompare
							comparison={comparison}
							geographyNames={geographyNames}
						/>
					)}
				</section>
			)}
		</section>
	);
}
