"use client";

import { useState } from "react";
import { VIETNAM_REPORT_TIME_ZONE, vietnamCalendarDay, vietnamDateRange, type InquiryAnalytics } from "./reporting";
import type { buildSnapshotComparison } from "./snapshots";
import { useI18n } from "../../lib/i18n/provider";
import { levelLabel } from "../../lib/i18n/data-labels";
import type { MessageKey } from "../../lib/i18n";

type Row = { reference_code: string; status: string; close_reason: string | null; country: string | null; sector: string | null; geography_ids: string[]; updated_at: string };
type Metrics = InquiryAnalytics;
type Pagination = { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
type SnapshotAudit = { event_id: string; actor: string; action: string; happened_at: string };
type Snapshot = { snapshot_id: string; period_start: string; period_end: string; filters: Record<string, unknown>; time_zone: string; formula_version: string; corrects_snapshot_id: string | null; created_at: string; metrics: Metrics; audit?: SnapshotAudit[]; geography_names?: Record<string, string> };
type GeographyOption = { id: string; name: string; displayName: string; level: string; code: string };
type Comparison = ReturnType<typeof buildSnapshotComparison>;

const filterLabelKeys: Record<string, MessageKey> = {
  status: "admin.status", country: "admin.country", sector: "admin.sector", referenceCode: "reports.referenceCode",
  geographyIds: "reports.geography", timeZone: "reports.timeZone", formulaVersion: "reports.formulaVersion",
};

const statusOptions: Array<{ value: string; key: MessageKey }> = [
  { value: "new", key: "admin.new" },
  { value: "contacted", key: "admin.contacted" },
  { value: "qualified", key: "admin.qualified" },
  { value: "closed", key: "admin.closed" },
];

const closeReasons: Array<{ value: string; key: MessageKey }> = [
  { value: "spam", key: "admin.reasonSpam" },
  { value: "duplicate", key: "admin.reasonDuplicate" },
  { value: "out_of_scope", key: "admin.reasonOutOfScope" },
  { value: "resolved", key: "admin.reasonResolved" },
];

function saveCsv(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Detail = { inquiry: { reference_code: string; email: string | null; message: string | null; status: string; close_reason: string | null; geography_ids: string[]; provenance: { geographyVersionCode?: string; datasets?: Array<{ code: string; version: string }> }; anonymized_at: string | null }; audit: Array<{ actor: string; action: string; from_status: string | null; to_status: string | null; note: string | null; happened_at: string }> };

export function InquiryDashboard() {
  const { t, locale, formatDate, formatPercent } = useI18n();
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<"inquiries" | "reports">("inquiries");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [geographies, setGeographies] = useState<GeographyOption[]>([]);
  const [geographyNames, setGeographyNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);
  const [preview, setPreview] = useState<{ key: string; total: number } | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [compareId, setCompareId] = useState("");
  const [correctionId, setCorrectionId] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [geographyQuery, setGeographyQuery] = useState("");
  const [geographyOptions, setGeographyOptions] = useState<GeographyOption[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const now = new Date();
  const dateRange = vietnamDateRange(from, to);
  const reportRange = vietnamDateRange(from || vietnamCalendarDay(now, 6), to || vietnamCalendarDay(now));
  const snapshotInput = {
    periodStart: reportRange.from!,
    periodEnd: reportRange.to!,
    timeZone: VIETNAM_REPORT_TIME_ZONE,
    filters: { status: status || undefined, country: country.trim() || undefined, sector: sector.trim() || undefined,
      geographyIds: geographies.length ? geographies.map(({ id }) => id) : undefined },
    correctsSnapshotId: correctionId || undefined,
  };
  const previewKey = JSON.stringify(snapshotInput);
  const currentPreview = preview?.key === previewKey ? preview : null;
  const validPeriod = snapshotInput.periodStart < snapshotInput.periodEnd;
  const statusChanged = selected !== null && nextStatus !== selected.inquiry.status;
  const needsCloseReason = statusChanged && nextStatus === "closed";
  const canSave = (statusChanged || note.trim()) && (!needsCloseReason || closeReason);

  const statusLabel = (value: string) => statusOptions.find((option) => option.value === value)
    ? t(statusOptions.find((option) => option.value === value)!.key) : value;

  function reportDate(value: string, timeZone: string, includeTime = false) {
    return formatDate(value, { timeZone, includeTime });
  }

  function reportPeriod(snapshot: Pick<Snapshot, "period_start" | "period_end" | "time_zone">) {
    const lastIncluded = new Date(Date.parse(snapshot.period_end) - 1).toISOString();
    return `${reportDate(snapshot.period_start, snapshot.time_zone)} – ${reportDate(lastIncluded, snapshot.time_zone)}`;
  }

  function filterValue(key: string, value: unknown, names: Record<string, string>) {
    if (value == null) return t("admin.all");
    if (key === "geographyIds" && Array.isArray(value)) return value.map((id) => names[id] ?? id).join(", ");
    if (key === "status") return statusLabel(String(value));
    return String(value);
  }

  function filterSummary(filters: Record<string, unknown>, names: Record<string, string>) {
    const entries = Object.entries(filters).filter(([key, value]) => key in filterLabelKeys && value != null &&
      value !== "" && !(Array.isArray(value) && !value.length));
    return entries.length
      ? entries.map(([key, value]) => `${t(filterLabelKeys[key])}: ${filterValue(key, value, names)}`).join(" · ")
      : t("reports.allInquiries");
  }

  async function request<T>(path: string, fallback: string, body?: object): Promise<T> {
    const response = await fetch(path, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}`, ...(body && { "content-type": "application/json" }) },
      ...(body && { method: "PATCH", body: JSON.stringify(body) }),
    });
    const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
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
    if (geographies.length) params.set("geographyIds", geographies.map(({ id }) => id).join(","));
    if (includePage) { params.set("page", String(page)); params.set("pageSize", String(pageSize)); }
    return params;
  }

  async function fetchRows() {
    const body = await request<{ data: Row[]; metrics: Metrics; pagination: Pagination }>(`/api/internal/inquiries?${filterParams()}`, t("admin.error.load"));
    setMetrics(body.metrics);
    setPagination(body.pagination);
    return body.data;
  }

  async function fetchDetail(referenceCode: string) {
    const body = await request<{ data: Detail }>(`/api/internal/inquiries/${referenceCode}`, t("admin.error.detail"));
    return body.data;
  }

  function showDetail(detail: Detail | null) {
    setSelected(detail);
    setNextStatus(detail?.inquiry.status ?? "");
    setCloseReason("");
    setNote("");
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
      setError(cause instanceof Error ? cause.message : t("admin.error.generic"));
    } finally {
      setBusy(false);
    }
  }

  function load() {
    void run(t("admin.notice.loading"), async () => {
      const loaded = await fetchRows();
      setRows(loaded);
      showDetail(null);
      setNotice(loaded.length ? t("admin.notice.loaded") : t("admin.notice.none"));
    });
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    void run(t("admin.notice.loading"), async () => {
      const params = filterParams(false); params.set("page", String(nextPage)); params.set("pageSize", String(pageSize));
      const body = await request<{ data: Row[]; metrics: Metrics; pagination: Pagination }>(`/api/internal/inquiries?${params}`, t("admin.error.load"));
      setRows(body.data); setMetrics(body.metrics); setPagination(body.pagination); showDetail(null); setNotice(t("admin.notice.loaded"));
    });
  }

  function downloadCsv() {
    const params = filterParams(false);
    void run(t("admin.notice.csvPreparing"), async () => {
      const response = await fetch(`/api/internal/inquiries?${params}&format=csv`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(t("admin.error.export"));
      saveCsv(await response.blob(), "investor-inquiries.csv");
      setNotice(t("admin.notice.csvExported"));
    });
  }

  function prepareSnapshot(previewOnly: boolean) {
    if (!validPeriod || (!previewOnly && !currentPreview)) return;
    void run(previewOnly ? t("reports.notice.calculating") : t("reports.notice.saving"), async () => {
      const response = await fetch("/api/internal/inquiries/snapshots", {
        method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ ...snapshotInput, preview: previewOnly }),
      });
      const body = await response.json() as { data?: { total: number } & Snapshot; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? t("reports.error.prepare"));
      if (previewOnly) {
        setPreview({ key: previewKey, total: body.data.total });
        setNotice(t("reports.notice.calculated"));
        return;
      }
      setCorrectionId("");
      setPreview(null);
      setNotice(body.data.metrics.total === currentPreview?.total
        ? t("reports.notice.saved")
        : t("reports.notice.savedChanged", { count: body.data.metrics.total }));
      try {
        await loadSnapshots();
      } catch {
        setNotice(t("reports.notice.savedReload"));
      }
    });
  }

  async function loadSnapshots() {
    const body = await request<{ data: Snapshot[] }>("/api/internal/inquiries/snapshots", t("reports.error.history"));
    setSnapshots(body.data);
    setSnapshotsLoaded(true);
  }

  function refreshHistory() {
    void run(t("reports.notice.loadingHistory"), async () => {
      await loadSnapshots();
      setNotice("");
    });
  }

  function openSnapshot(snapshotId: string) {
    void run(t("reports.notice.snapshotLoading"), async () => {
      const body = await request<{ data: Snapshot }>(`/api/internal/inquiries/snapshots/${snapshotId}`, t("reports.error.snapshot"));
      setSelectedSnapshot(body.data);
      if (body.data.geography_names) setGeographyNames((previous) => ({ ...previous, ...body.data.geography_names }));
      setCompareId("");
      setComparison(null);
      setNotice(t("reports.notice.snapshotLoaded"));
    });
  }

  function exportSnapshot(snapshotId: string) {
    void run(t("reports.notice.exportPreparing"), async () => {
      const response = await fetch("/api/internal/inquiries/snapshots/export", {
        method: "POST", cache: "no-store", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
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
      const response = await fetch("/api/internal/inquiries/snapshots/compare", {
        method: "POST", cache: "no-store", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ left: selectedSnapshot.snapshot_id, right: compareId }),
      });
      const body = await response.json().catch(() => null) as { data?: Comparison; error?: string } | null;
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
      setNotice(t("reports.notice.compared", { delta: `${body.data.delta.total >= 0 ? "+" : ""}${body.data.delta.total}` }));
    });
  }

  function searchGeographies() {
    if (geographyQuery.trim().length < 2) return;
    void run(t("admin.notice.searching"), async () => {
      const response = await fetch(`/api/geographies?q=${encodeURIComponent(geographyQuery.trim())}`);
      const body = await response.json() as { data?: GeographyOption[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? t("admin.error.search"));
      setGeographyOptions(body.data ?? []);
      setNotice(body.data?.length ? "" : t("admin.notice.geographyNone"));
    });
  }

  function addGeography(option: GeographyOption) {
    setGeographies((previous) => previous.some(({ id }) => id === option.id) ? previous : [...previous, option]);
    setGeographyNames((previous) => ({ ...previous, [option.id]: option.displayName || option.name }));
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
      await request(`/api/internal/inquiries/${referenceCode}`, t("admin.error.update"), payload);
      try {
        const [detail, refreshed] = await Promise.all([fetchDetail(referenceCode), fetchRows()]);
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

  return <section className="inquiry-dashboard">
    <p>{t("admin.accessNote")}</p>
    <nav className="inquiry-dashboard-tabs" aria-label={t("admin.tabsAria")}>
      <button type="button" disabled={busy} aria-pressed={activeTab === "inquiries"} onClick={() => setActiveTab("inquiries")}>{t("admin.inquiries")}</button>
      <button type="button" disabled={busy} aria-pressed={activeTab === "reports"} onClick={() => {
        setActiveTab("reports");
        if (token && !snapshotsLoaded) refreshHistory();
      }}>{t("admin.reports")}</button>
    </nav>
    <label>{t("admin.token")}<input type="password" value={token} disabled={busy} onChange={(event) => {
      setToken(event.target.value);
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
    }} autoComplete="off" /></label>
    <fieldset className="inquiry-dashboard-filters">
      <legend>{t("admin.filters")}</legend>
      <label>{t("admin.status")}<select value={status} disabled={busy} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        <option value="">{t("admin.all")}</option>{statusOptions.map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}
      </select></label>
      <label>{t("admin.country")}<input value={country} disabled={busy} onChange={(event) => { setCountry(event.target.value); setPage(1); }} /></label>
      <label>{t("admin.sector")}<input value={sector} disabled={busy} onChange={(event) => { setSector(event.target.value); setPage(1); }} /></label>
      <label>{t("admin.from")}<input type="date" value={from} disabled={busy} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
      <label>{t("admin.to")}<input type="date" value={to} disabled={busy} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
      <form className="inquiry-geography-picker" onSubmit={(event) => { event.preventDefault(); searchGeographies(); }}>
        <label>{t("admin.searchGeography")}<input value={geographyQuery} disabled={busy} placeholder={t("admin.geographyPlaceholder")} onChange={(event) => {
          setGeographyQuery(event.target.value);
          setGeographyOptions([]);
        }} /></label>
        <button type="submit" disabled={busy || geographyQuery.trim().length < 2}>{t("admin.findGeography")}</button>
        {geographyOptions.length > 0 && <ul aria-label={t("admin.resultsAria")}>{geographyOptions.map((option) => <li key={option.id}>
          <button type="button" disabled={busy || geographies.some(({ id }) => option.id === id)} onClick={() => addGeography(option)}>
            {option.displayName || option.name} · {levelLabel(locale, option.level)} ({option.code})
          </button>
        </li>)}</ul>}
        {geographies.length > 0 && <ul className="inquiry-geography-selected" aria-label={t("admin.selectedAria")}>{geographies.map((option) => <li key={option.id}>
          <button type="button" disabled={busy} aria-label={t("admin.removeGeography", { name: option.displayName || option.name })} onClick={() => {
            setGeographies((previous) => previous.filter(({ id }) => option.id !== id)); setPage(1);
          }}>{option.displayName || option.name} ×</button>
        </li>)}</ul>}
      </form>
    </fieldset>
    <p role="status">{notice}</p>
    {error && <p role="alert">{error}</p>}
    {activeTab === "inquiries" && <>
    <div className="inquiry-report-actions">
      <label>{t("admin.rowsPerPage")}<select value={pageSize} disabled={busy} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
      <button type="button" disabled={busy} onClick={load}>{t("admin.load")}</button>
      <button type="button" disabled={busy || !token} onClick={downloadCsv}>{t("admin.exportCsv")}</button>
    </div>
    {metrics && <section aria-label={t("admin.metricsTitle")}><h2>{t("admin.metricsTitle")}</h2>
      <p>{t("admin.total", { count: metrics.total })}</p>
      <p>{t("admin.statusBreakdown", {
        new: metrics.byStatus.new ?? 0, contacted: metrics.byStatus.contacted ?? 0,
        qualified: metrics.byStatus.qualified ?? 0, closed: metrics.byStatus.closed ?? 0,
      })}</p>
      <p>{t("admin.rates", { contacted: formatPercent(metrics.contactedRate), qualified: formatPercent(metrics.qualifiedRate) })}</p>
      <p>{t("admin.averageHours", { hours: metrics.averageHoursToContacted === null ? "—" : metrics.averageHoursToContacted.toFixed(1) })}</p>
      <h3>{t("admin.weeklyTrend")}</h3><p>{Object.entries(metrics.weeklyTrend).map(([week, count]) => `${week}: ${count}`).join(" · ") || "—"}</p>
      <h3>{t("admin.byGeography")}</h3><p>{Object.entries(metrics.byGeography).map(([geography, count]) => `${geography}: ${count}`).join(" · ") || "—"}</p>
      <h3>{t("admin.byCountry")}</h3><p>{Object.entries(metrics.byCountry).map(([value, count]) => `${value}: ${count}`).join(" · ") || "—"}</p>
      <h3>{t("admin.bySector")}</h3><p>{Object.entries(metrics.bySector).map(([value, count]) => `${value}: ${count}`).join(" · ") || "—"}</p>
    </section>}
    <ul aria-label={t("admin.listAria")}>{rows.map((row) => <li key={row.reference_code}>
      <button type="button" disabled={busy} onClick={() => openDetail(row.reference_code)}><strong>{row.reference_code}</strong></button>{" · "}{t("admin.row", {
        status: statusLabel(row.status),
        country: row.country ?? t("common.countryNotProvided"),
        sector: row.sector ?? t("common.sectorNotProvided"),
        places: row.geography_ids.length,
      })}
    </li>)}</ul>
    {pagination && <nav aria-label={t("admin.pagesAria")}><p>{t("admin.pageInfo", { page: pagination.page, pages: pagination.totalPages, total: pagination.total })}</p><button type="button" disabled={busy || !pagination.hasPrevious} onClick={() => changePage(pagination.page - 1)}>{t("admin.previous")}</button><button type="button" disabled={busy || !pagination.hasNext} onClick={() => changePage(pagination.page + 1)}>{t("admin.next")}</button></nav>}
    {selected && <article className="inquiry-detail">
      <h2>{selected.inquiry.reference_code}</h2>
      {selected.inquiry.anonymized_at ? <p>{t("admin.anonymized")}</p> : <>
        <p><strong>{t("admin.email")}</strong> {selected.inquiry.email}</p>
        <p><strong>{t("admin.message")}</strong> {selected.inquiry.message}</p>
      </>}
      <p><strong>{t("admin.geographyVersion")}</strong> {selected.inquiry.provenance.geographyVersionCode ?? t("common.unavailable")}</p>
      <p><strong>{t("admin.statusLabel")}</strong> {statusLabel(selected.inquiry.status)}</p>
      <label>{t("admin.updateStatus")}<select value={nextStatus} disabled={busy} onChange={(event) => setNextStatus(event.target.value)}>
        {statusOptions.map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}
      </select></label>
      {needsCloseReason && <label>{t("admin.closeReason")}<select value={closeReason} disabled={busy} onChange={(event) => setCloseReason(event.target.value)}>
        <option value="">{t("admin.chooseReason")}</option>{closeReasons.map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}
      </select></label>}
      {!selected.inquiry.anonymized_at && <label>{t("admin.internalNote")}<textarea value={note} disabled={busy} onChange={(event) => setNote(event.target.value)} maxLength={5000} /></label>}
      <button type="button" disabled={busy || !canSave} onClick={update}>{t("admin.saveUpdate")}</button>
      <h3>{t("admin.auditHistory")}</h3>
      <ol>{selected.audit.map((event, index) => <li key={`${event.happened_at}-${index}`}>{event.action}{event.from_status ? `: ${statusLabel(event.from_status)} → ${statusLabel(event.to_status ?? "")}` : ""}{event.note ? ` — ${event.note}` : ""}</li>)}</ol>
    </article>}
    </>}
    {activeTab === "reports" && <section className="inquiry-reports" aria-label={t("admin.reports")}>
      <section aria-label={t("reports.previewAria")}>
        <h2>{t("reports.previewTitle")}</h2>
        <dl className="inquiry-report-meta">
          <dt>{t("reports.period")}</dt>
          <dd>{validPeriod ? reportPeriod({ period_start: snapshotInput.periodStart, period_end: snapshotInput.periodEnd, time_zone: VIETNAM_REPORT_TIME_ZONE }) : t("reports.chooseEndDate")}</dd>
          <dt>{t("reports.filters")}</dt><dd>{filterSummary(snapshotInput.filters, geographyNames)}</dd>
          <dt>{t("reports.totalInquiry")}</dt><dd>{currentPreview?.total ?? t("reports.previewHint")}</dd>
        </dl>
        {correctionId && <p>{t("reports.correctionFrom", { id: correctionId })} <button type="button" disabled={busy} onClick={() => setCorrectionId("")}>{t("reports.cancelCorrection")}</button></p>}
        <div className="inquiry-report-actions">
          <button type="button" disabled={busy || !token || !validPeriod} onClick={() => prepareSnapshot(true)}>{t("reports.preview")}</button>
          <button type="button" className="inquiry-primary" disabled={busy || !token || !currentPreview} onClick={() => prepareSnapshot(false)}>
            {correctionId ? t("reports.saveCorrection") : t("reports.save")}
          </button>
        </div>
      </section>
      <section aria-label={t("reports.history")}>
        <div className="inquiry-report-actions"><h2>{t("reports.history")}</h2><button type="button" disabled={busy || !token} onClick={refreshHistory}>{t("reports.loadHistory")}</button></div>
        {snapshots.length > 0 ? <div className="inquiry-report-scroll" role="region" aria-label={t("reports.tableAria")} tabIndex={0}>
          <table>
            <thead><tr><th scope="col">{t("reports.periodCol")}</th><th scope="col">{t("reports.typeCol")}</th><th scope="col">{t("reports.createdCol")}</th><th scope="col">{t("reports.totalCol")}</th><th scope="col">{t("reports.csvCol")}</th></tr></thead>
            <tbody>{snapshots.map((snapshot) => <tr key={snapshot.snapshot_id} data-testid={`snapshot-row-${snapshot.snapshot_id}`}>
              <th scope="row"><button type="button" disabled={busy} onClick={() => openSnapshot(snapshot.snapshot_id)}>{reportPeriod(snapshot)}</button></th>
              <td>{snapshot.corrects_snapshot_id ? t("reports.correction") : t("reports.original")}</td>
              <td>{reportDate(snapshot.created_at, snapshot.time_zone, true)}</td>
              <td>{snapshot.metrics.total}</td>
              <td><button type="button" disabled={busy} onClick={() => exportSnapshot(snapshot.snapshot_id)}>{t("reports.exportStored")}</button></td>
            </tr>)}</tbody>
          </table>
        </div> : <p>{snapshotsLoaded ? t("reports.noReports") : t("reports.tokenFirst")}</p>}
      </section>
      {selectedSnapshot && <article aria-label={t("reports.snapshotAria")}>
        <h2>{reportPeriod(selectedSnapshot)} · {selectedSnapshot.corrects_snapshot_id ? t("reports.correction") : t("reports.original")}</h2>
        <dl className="inquiry-report-meta">
          <dt>{t("reports.filters")}</dt><dd>{filterSummary(selectedSnapshot.filters, geographyNames)}</dd>
          <dt>{t("reports.savedTotal")}</dt><dd>{selectedSnapshot.metrics.total}</dd>
          <dt>{t("reports.formulaVersion")}</dt><dd>{selectedSnapshot.formula_version}</dd>
          <dt>{t("reports.timeZone")}</dt><dd>{selectedSnapshot.time_zone}</dd>
          <dt>{t("reports.reportId")}</dt><dd><code>{selectedSnapshot.snapshot_id}</code></dd>
          {selectedSnapshot.corrects_snapshot_id && <><dt>{t("reports.correctsFor")}</dt><dd>
            <button type="button" disabled={busy} onClick={() => openSnapshot(selectedSnapshot.corrects_snapshot_id!)}>{t("reports.openCorrected")}</button>
          </dd></>}
        </dl>
        <div className="inquiry-report-actions">
          <button type="button" disabled={busy} onClick={createCorrection}>{t("reports.createCorrection")}</button>
          <label>{t("reports.compareWith")}<select value={compareId} disabled={busy} onChange={(event) => {
            setCompareId(event.target.value); setComparison(null);
          }}>
            <option value="">{t("reports.choosePeriod")}</option>
            {snapshots.filter((snapshot) => snapshot.snapshot_id !== selectedSnapshot.snapshot_id).map((snapshot) =>
              <option key={snapshot.snapshot_id} value={snapshot.snapshot_id}>
                {reportPeriod(snapshot)} · {snapshot.corrects_snapshot_id ? t("reports.correction") : t("reports.original")} · {reportDate(snapshot.created_at, snapshot.time_zone, true)}
              </option>)}
          </select></label>
          <button type="button" disabled={!compareId || busy} onClick={compareSnapshot}>{t("reports.compare")}</button>
        </div>
        <h3>{t("reports.auditLog")}</h3>
        <ol>{(selectedSnapshot.audit ?? []).map((event) => <li key={event.event_id}>
          {event.action} · {event.actor} · {reportDate(event.happened_at, selectedSnapshot.time_zone, true)}
        </li>)}</ol>
      </article>}
      {comparison && <section aria-label={t("reports.comparisonAria")}>
        <h2>{t("reports.comparisonTitle")}</h2>
        {comparison.compatible ? <div className="inquiry-report-scroll" role="region" aria-label={t("reports.tableCompareAria")} tabIndex={0}>
          <table>
            <thead><tr>
              <th scope="col">{t("reports.metricCol")}</th>
              {[comparison.left, comparison.right].map((item) => <th scope="col" key={item.snapshotId}>{reportPeriod({ period_start: item.periodStart, period_end: item.periodEnd, time_zone: item.timeZone })}</th>)}
              <th scope="col">{t("reports.deltaCol")}</th>
            </tr></thead>
            <tbody>{[
              { label: t("reports.totalInquiry"), left: comparison.left.total, right: comparison.right.total, delta: comparison.delta.total },
              ...statusOptions.map((option) => ({
                label: t(option.key),
                left: comparison.left.byStatus[option.value as keyof typeof comparison.left.byStatus] ?? 0,
                right: comparison.right.byStatus[option.value as keyof typeof comparison.right.byStatus] ?? 0,
                delta: comparison.delta.byStatus[option.value as keyof typeof comparison.delta.byStatus] ?? 0,
              })),
            ].map((row) => <tr key={row.label}>
              <th scope="row">{row.label}</th><td>{row.left}</td><td>{row.right}</td><td>{row.delta > 0 ? "+" : ""}{row.delta}</td>
            </tr>)}</tbody>
          </table>
        </div> : <ul aria-label={t("reports.differencesAria")}>{comparison.differences.map(({ field, left, right }) =>
          <li key={field}><strong>{filterLabelKeys[field] ? t(filterLabelKeys[field]) : field}</strong> · {filterValue(field, left, geographyNames)} → {filterValue(field, right, geographyNames)}</li>)}</ul>}
      </section>}
    </section>}
  </section>;
}
