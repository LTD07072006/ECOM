"use client";

import { useState } from "react";
import { VIETNAM_REPORT_TIME_ZONE, vietnamCalendarDay, vietnamDateRange, type InquiryAnalytics } from "./reporting";
import type { buildSnapshotComparison } from "./snapshots";

type Row = { reference_code: string; status: string; close_reason: string | null; country: string | null; sector: string | null; geography_ids: string[]; updated_at: string };
type Metrics = InquiryAnalytics;
type Pagination = { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
type SnapshotAudit = { event_id: string; actor: string; action: string; happened_at: string };
type Snapshot = { snapshot_id: string; period_start: string; period_end: string; filters: Record<string, unknown>; time_zone: string; formula_version: string; corrects_snapshot_id: string | null; created_at: string; metrics: Metrics; audit?: SnapshotAudit[]; geography_names?: Record<string, string> };
type GeographyOption = { id: string; name: string; displayName: string; level: string; code: string };
type Comparison = ReturnType<typeof buildSnapshotComparison>;

const filterLabels: Record<string, string> = {
  status: "Trạng thái", country: "Quốc gia", sector: "Lĩnh vực", referenceCode: "Mã inquiry",
  geographyIds: "Địa bàn", timeZone: "Múi giờ", formulaVersion: "Phiên bản công thức",
};
const statusLabels = { new: "Mới", contacted: "Đã liên hệ", qualified: "Đủ điều kiện", closed: "Đã đóng" };

function reportDate(value: string, timeZone: string, includeTime = false) {
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", ...(includeTime && { timeStyle: "short" }) };
  try {
    return new Intl.DateTimeFormat("vi-VN", { ...options, timeZone }).format(new Date(value));
  } catch (cause) {
    if (!(cause instanceof RangeError)) throw cause;
    return new Intl.DateTimeFormat("vi-VN", { ...options, timeZone: "UTC" }).format(new Date(value));
  }
}

function reportPeriod(snapshot: Pick<Snapshot, "period_start" | "period_end" | "time_zone">) {
  const lastIncluded = new Date(Date.parse(snapshot.period_end) - 1).toISOString();
  return `${reportDate(snapshot.period_start, snapshot.time_zone)} – ${reportDate(lastIncluded, snapshot.time_zone)}`;
}

function filterSummary(filters: Record<string, unknown>, names: Record<string, string>) {
  const entries = Object.entries(filters).filter(([key, value]) => key in filterLabels && value != null &&
    value !== "" && !(Array.isArray(value) && !value.length));
  return entries.length ? entries.map(([key, value]) => `${filterLabels[key]}: ${filterValue(key, value, names)}`).join(" · ") : "Tất cả inquiry";
}

function filterValue(key: string, value: unknown, names: Record<string, string>) {
  if (value == null) return "Tất cả";
  if (key === "geographyIds" && Array.isArray(value)) return value.map((id) => names[id] ?? id).join(", ");
  return String(value);
}

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
    const body = await request<{ data: Row[]; metrics: Metrics; pagination: Pagination }>(`/api/internal/inquiries?${filterParams()}`, "Unable to load inquiries.");
    setMetrics(body.metrics);
    setPagination(body.pagination);
    return body.data;
  }

  async function fetchDetail(referenceCode: string) {
    const body = await request<{ data: Detail }>(`/api/internal/inquiries/${referenceCode}`, "Unable to load inquiry.");
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
      setError(cause instanceof Error ? cause.message : "Unable to complete the inquiry operation.");
    } finally {
      setBusy(false);
    }
  }

  function load() {
    void run("Loading inquiries…", async () => {
      const loaded = await fetchRows();
      setRows(loaded);
      showDetail(null);
      setNotice(loaded.length ? "Inquiries loaded." : "No inquiries found.");
    });
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    void run("Loading inquiries…", async () => {
      const params = filterParams(false); params.set("page", String(nextPage)); params.set("pageSize", String(pageSize));
      const body = await request<{ data: Row[]; metrics: Metrics; pagination: Pagination }>(`/api/internal/inquiries?${params}`, "Unable to load inquiries.");
      setRows(body.data); setMetrics(body.metrics); setPagination(body.pagination); showDetail(null); setNotice("Inquiries loaded.");
    });
  }

  function downloadCsv() {
    const params = filterParams(false);
    void run("Preparing CSV…", async () => {
      const response = await fetch(`/api/internal/inquiries?${params}&format=csv`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Unable to export inquiries.");
      saveCsv(await response.blob(), "investor-inquiries.csv");
      setNotice("CSV exported without email, message, or internal notes.");
    });
  }

  function prepareSnapshot(previewOnly: boolean) {
    if (!validPeriod || (!previewOnly && !currentPreview)) return;
    void run(previewOnly ? "Đang tính số liệu xem trước…" : "Đang lưu báo cáo…", async () => {
      const response = await fetch("/api/internal/inquiries/snapshots", {
        method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ ...snapshotInput, preview: previewOnly }),
      });
      const body = await response.json() as { data?: { total: number } & Snapshot; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "Không thể chuẩn bị báo cáo.");
      if (previewOnly) {
        setPreview({ key: previewKey, total: body.data.total });
        setNotice("Đã tính số liệu xem trước.");
        return;
      }
      setCorrectionId("");
      setPreview(null);
      setNotice(body.data.metrics.total === currentPreview?.total
        ? "Đã lưu báo cáo."
        : `Đã lưu báo cáo với ${body.data.metrics.total} inquiry. Số liệu đã thay đổi kể từ lúc xem trước.`);
      try {
        await loadSnapshots();
      } catch {
        setNotice("Đã lưu báo cáo. Tải lại lịch sử để xem bản vừa lưu.");
      }
    });
  }

  async function loadSnapshots() {
    const body = await request<{ data: Snapshot[] }>("/api/internal/inquiries/snapshots", "Unable to load report snapshots.");
    setSnapshots(body.data);
    setSnapshotsLoaded(true);
  }

  function refreshHistory() {
    void run("Đang tải lịch sử báo cáo…", async () => {
      await loadSnapshots();
      setNotice("");
    });
  }

  function openSnapshot(snapshotId: string) {
    void run("Loading report snapshot…", async () => {
      const body = await request<{ data: Snapshot }>(`/api/internal/inquiries/snapshots/${snapshotId}`, "Unable to load report snapshot.");
      setSelectedSnapshot(body.data);
      if (body.data.geography_names) setGeographyNames((previous) => ({ ...previous, ...body.data.geography_names }));
      setCompareId("");
      setComparison(null);
      setNotice("Historical snapshot loaded.");
    });
  }

  function exportSnapshot(snapshotId: string) {
    void run("Preparing stored snapshot CSV…", async () => {
      const response = await fetch("/api/internal/inquiries/snapshots/export", {
        method: "POST", cache: "no-store", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ id: snapshotId }),
      });
      if (!response.ok) throw new Error("Unable to export stored snapshot.");
      saveCsv(await response.blob(), `inquiry-snapshot-${snapshotId}.csv`);
      setNotice("Stored snapshot CSV downloaded.");
    });
  }

  function compareSnapshot() {
    if (!selectedSnapshot || !compareId) return;
    void run("Comparing report snapshots…", async () => {
      const response = await fetch("/api/internal/inquiries/snapshots/compare", {
        method: "POST", cache: "no-store", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ left: selectedSnapshot.snapshot_id, right: compareId }),
      });
      const body = await response.json().catch(() => null) as { data?: Comparison; error?: string } | null;
      if (!response.ok) {
        if (response.status === 409 && body?.data) {
          setComparison(body.data);
          setNotice("Xem các điều kiện báo cáo khác nhau.");
          return;
        }
        throw new Error(body?.error ?? "Unable to compare snapshots.");
      }
      if (!body?.data) throw new Error("Unable to compare snapshots.");
      setComparison(body.data);
      setNotice(`Snapshot comparison complete. Total change: ${body.data.delta.total >= 0 ? "+" : ""}${body.data.delta.total}.`);
    });
  }

  function searchGeographies() {
    if (geographyQuery.trim().length < 2) return;
    void run("Searching geographies…", async () => {
      const response = await fetch(`/api/geographies?q=${encodeURIComponent(geographyQuery.trim())}`);
      const body = await response.json() as { data?: GeographyOption[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to search geographies.");
      setGeographyOptions(body.data ?? []);
      setNotice(body.data?.length ? "" : "Không tìm thấy địa bàn.");
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
    setNotice("Kiểm tra kỳ và bộ lọc rồi xem trước bản đính chính.");
  }

  function openDetail(referenceCode: string) {
    void run("Loading inquiry…", async () => {
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
    void run("Saving inquiry…", async () => {
      await request(`/api/internal/inquiries/${referenceCode}`, "Unable to update inquiry.", payload);
      try {
        const [detail, refreshed] = await Promise.all([fetchDetail(referenceCode), fetchRows()]);
        showDetail(detail);
        setRows(refreshed);
        setNotice("Inquiry updated.");
      } catch {
        showDetail(null);
        setRows([]);
        throw new Error("The update was saved. Load inquiries to refresh the dashboard.");
      }
    });
  }

  return <section className="inquiry-dashboard">
    <p>Steward pilot access. The token identifies the steward role, not an individual operator.</p>
    <nav className="inquiry-dashboard-tabs" aria-label="Inquiry dashboard tabs">
      <button type="button" disabled={busy} aria-pressed={activeTab === "inquiries"} onClick={() => setActiveTab("inquiries")}>Inquiries</button>
      <button type="button" disabled={busy} aria-pressed={activeTab === "reports"} onClick={() => {
        setActiveTab("reports");
        if (token && !snapshotsLoaded) refreshHistory();
      }}>Báo cáo</button>
    </nav>
    <label>Steward token<input type="password" value={token} disabled={busy} onChange={(event) => {
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
      <legend>Bộ lọc</legend>
      <label>Status<select value={status} disabled={busy} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        <option value="">All</option><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option>
      </select></label>
      <label>Country<input value={country} disabled={busy} onChange={(event) => { setCountry(event.target.value); setPage(1); }} /></label>
      <label>Sector<input value={sector} disabled={busy} onChange={(event) => { setSector(event.target.value); setPage(1); }} /></label>
      <label>From<input type="date" value={from} disabled={busy} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
      <label>To<input type="date" value={to} disabled={busy} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
      <form className="inquiry-geography-picker" onSubmit={(event) => { event.preventDefault(); searchGeographies(); }}>
        <label>Search geography by name<input value={geographyQuery} disabled={busy} placeholder="Hà Nội" onChange={(event) => {
          setGeographyQuery(event.target.value);
          setGeographyOptions([]);
        }} /></label>
        <button type="submit" disabled={busy || geographyQuery.trim().length < 2}>Find geography</button>
        {geographyOptions.length > 0 && <ul aria-label="Geography search results">{geographyOptions.map((option) => <li key={option.id}>
          <button type="button" disabled={busy || geographies.some(({ id }) => option.id === id)} onClick={() => addGeography(option)}>
            {option.displayName || option.name} · {option.level} ({option.code})
          </button>
        </li>)}</ul>}
        {geographies.length > 0 && <ul className="inquiry-geography-selected" aria-label="Địa bàn đã chọn">{geographies.map((option) => <li key={option.id}>
          <button type="button" disabled={busy} aria-label={`Bỏ ${option.displayName || option.name}`} onClick={() => {
            setGeographies((previous) => previous.filter(({ id }) => option.id !== id)); setPage(1);
          }}>{option.displayName || option.name} ×</button>
        </li>)}</ul>}
      </form>
    </fieldset>
    <p role="status">{notice}</p>
    {error && <p role="alert">{error}</p>}
    {activeTab === "inquiries" && <>
    <div className="inquiry-report-actions">
      <label>Rows per page<select value={pageSize} disabled={busy} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
      <button type="button" disabled={busy} onClick={load}>Load inquiries</button>
      <button type="button" disabled={busy || !token} onClick={downloadCsv}>Export safe CSV</button>
    </div>
    {metrics && <section aria-label="Inquiry metrics"><h2>Funnel metrics</h2><p>Total: {metrics.total}</p><p>New: {metrics.byStatus.new ?? 0} · Contacted: {metrics.byStatus.contacted ?? 0} · Qualified: {metrics.byStatus.qualified ?? 0} · Closed: {metrics.byStatus.closed ?? 0}</p><p>Contacted rate: {(metrics.contactedRate * 100).toFixed(1)}% · Qualified/closed rate: {(metrics.qualifiedRate * 100).toFixed(1)}%</p><p>Average hours to contacted: {metrics.averageHoursToContacted === null ? "—" : metrics.averageHoursToContacted.toFixed(1)}</p><h3>Weekly trend</h3><p>{Object.entries(metrics.weeklyTrend).map(([week, count]) => `${week}: ${count}`).join(" · ") || "—"}</p><h3>By geography</h3><p>{Object.entries(metrics.byGeography).map(([geography, count]) => `${geography}: ${count}`).join(" · ") || "—"}</p><h3>Normalized country</h3><p>{Object.entries(metrics.byCountry).map(([value, count]) => `${value}: ${count}`).join(" · ") || "—"}</p><h3>Normalized sector</h3><p>{Object.entries(metrics.bySector).map(([value, count]) => `${value}: ${count}`).join(" · ") || "—"}</p></section>}
    <ul aria-label="Inquiries">{rows.map((row) => <li key={row.reference_code}>
      <button type="button" disabled={busy} onClick={() => openDetail(row.reference_code)}><strong>{row.reference_code}</strong></button> · {row.status} · {row.country ?? "Country not provided"} · {row.sector ?? "Sector not provided"} · {row.geography_ids.length} place(s)
    </li>)}</ul>
    {pagination && <nav aria-label="Inquiry pages"><p>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} matching inquiries)</p><button type="button" disabled={busy || !pagination.hasPrevious} onClick={() => changePage(pagination.page - 1)}>Previous</button><button type="button" disabled={busy || !pagination.hasNext} onClick={() => changePage(pagination.page + 1)}>Next</button></nav>}
    {selected && <article className="inquiry-detail">
      <h2>{selected.inquiry.reference_code}</h2>
      {selected.inquiry.anonymized_at ? <p>This inquiry has been anonymized under the retention policy.</p> : <>
        <p><strong>Email:</strong> {selected.inquiry.email}</p>
        <p><strong>Message:</strong> {selected.inquiry.message}</p>
      </>}
      <p><strong>Geography version:</strong> {selected.inquiry.provenance.geographyVersionCode ?? "Unavailable"}</p>
      <p><strong>Status:</strong> {selected.inquiry.status}</p>
      <label>Update status<select value={nextStatus} disabled={busy} onChange={(event) => setNextStatus(event.target.value)}>
        <option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option>
      </select></label>
      {needsCloseReason && <label>Close reason<select value={closeReason} disabled={busy} onChange={(event) => setCloseReason(event.target.value)}>
        <option value="">Choose a reason</option><option value="spam">Spam</option><option value="duplicate">Duplicate</option><option value="out_of_scope">Out of scope</option><option value="resolved">Resolved</option>
      </select></label>}
      {!selected.inquiry.anonymized_at && <label>Internal note<textarea value={note} disabled={busy} onChange={(event) => setNote(event.target.value)} maxLength={5000} /></label>}
      <button type="button" disabled={busy || !canSave} onClick={update}>Save update</button>
      <h3>Audit history</h3>
      <ol>{selected.audit.map((event, index) => <li key={`${event.happened_at}-${index}`}>{event.action}{event.from_status ? `: ${event.from_status} → ${event.to_status}` : ""}{event.note ? ` — ${event.note}` : ""}</li>)}</ol>
    </article>}
    </>}
    {activeTab === "reports" && <section className="inquiry-reports" aria-label="Báo cáo">
      <section aria-label="Xem trước báo cáo">
        <h2>Xem trước báo cáo</h2>
        <dl className="inquiry-report-meta">
          <dt>Kỳ báo cáo · Giờ Việt Nam</dt>
          <dd>{validPeriod ? reportPeriod({ period_start: snapshotInput.periodStart, period_end: snapshotInput.periodEnd, time_zone: VIETNAM_REPORT_TIME_ZONE }) : "Chọn ngày kết thúc từ ngày bắt đầu trở đi."}</dd>
          <dt>Bộ lọc</dt><dd>{filterSummary(snapshotInput.filters, geographyNames)}</dd>
          <dt>Tổng inquiry</dt><dd>{currentPreview?.total ?? "Bấm Xem trước để tính theo kỳ và bộ lọc này."}</dd>
        </dl>
        {correctionId && <p>Đính chính từ <code>{correctionId}</code> <button type="button" disabled={busy} onClick={() => setCorrectionId("")}>Hủy đính chính</button></p>}
        <div className="inquiry-report-actions">
          <button type="button" disabled={busy || !token || !validPeriod} onClick={() => prepareSnapshot(true)}>Xem trước</button>
          <button type="button" className="inquiry-primary" disabled={busy || !token || !currentPreview} onClick={() => prepareSnapshot(false)}>
            {correctionId ? "Lưu bản đính chính" : "Lưu báo cáo"}
          </button>
        </div>
      </section>
      <section aria-label="Lịch sử theo kỳ">
        <div className="inquiry-report-actions"><h2>Lịch sử theo kỳ</h2><button type="button" disabled={busy || !token} onClick={refreshHistory}>Tải lịch sử</button></div>
        {snapshots.length > 0 ? <div className="inquiry-report-scroll" role="region" aria-label="Bảng lịch sử" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Kỳ</th><th scope="col">Loại</th><th scope="col">Ngày tạo</th><th scope="col">Tổng inquiry</th><th scope="col">Tải CSV</th></tr></thead>
            <tbody>{snapshots.map((snapshot) => <tr key={snapshot.snapshot_id} data-testid={`snapshot-row-${snapshot.snapshot_id}`}>
              <th scope="row"><button type="button" disabled={busy} onClick={() => openSnapshot(snapshot.snapshot_id)}>{reportPeriod(snapshot)}</button></th>
              <td>{snapshot.corrects_snapshot_id ? "Đính chính" : "Bản gốc"}</td>
              <td>{reportDate(snapshot.created_at, snapshot.time_zone, true)}</td>
              <td>{snapshot.metrics.total}</td>
              <td><button type="button" disabled={busy} onClick={() => exportSnapshot(snapshot.snapshot_id)}>Export stored snapshot</button></td>
            </tr>)}</tbody>
          </table>
        </div> : <p>{snapshotsLoaded ? "Chưa có báo cáo. Xem trước và lưu kỳ đầu tiên." : "Nhập steward token rồi tải lịch sử."}</p>}
      </section>
      {selectedSnapshot && <article aria-label="Selected report snapshot">
        <h2>{reportPeriod(selectedSnapshot)} · {selectedSnapshot.corrects_snapshot_id ? "Đính chính" : "Bản gốc"}</h2>
        <dl className="inquiry-report-meta">
          <dt>Bộ lọc</dt><dd>{filterSummary(selectedSnapshot.filters, geographyNames)}</dd>
          <dt>Tổng đã lưu</dt><dd>{selectedSnapshot.metrics.total}</dd>
          <dt>Phiên bản công thức</dt><dd>{selectedSnapshot.formula_version}</dd>
          <dt>Múi giờ</dt><dd>{selectedSnapshot.time_zone}</dd>
          <dt>Mã báo cáo</dt><dd><code>{selectedSnapshot.snapshot_id}</code></dd>
          {selectedSnapshot.corrects_snapshot_id && <><dt>Đính chính cho</dt><dd>
            <button type="button" disabled={busy} onClick={() => openSnapshot(selectedSnapshot.corrects_snapshot_id!)}>Mở bản được đính chính</button>
          </dd></>}
        </dl>
        <div className="inquiry-report-actions">
          <button type="button" disabled={busy} onClick={createCorrection}>Tạo bản đính chính</button>
          <label>So sánh với báo cáo<select value={compareId} disabled={busy} onChange={(event) => {
            setCompareId(event.target.value); setComparison(null);
          }}>
            <option value="">Chọn một kỳ</option>
            {snapshots.filter((snapshot) => snapshot.snapshot_id !== selectedSnapshot.snapshot_id).map((snapshot) =>
              <option key={snapshot.snapshot_id} value={snapshot.snapshot_id}>
                {reportPeriod(snapshot)} · {snapshot.corrects_snapshot_id ? "Đính chính" : "Bản gốc"} · {reportDate(snapshot.created_at, snapshot.time_zone, true)}
              </option>)}
          </select></label>
          <button type="button" disabled={!compareId || busy} onClick={compareSnapshot}>So sánh</button>
        </div>
        <h3>Nhật ký</h3>
        <ol>{(selectedSnapshot.audit ?? []).map((event) => <li key={event.event_id}>
          {event.action} · {event.actor} · {reportDate(event.happened_at, selectedSnapshot.time_zone, true)}
        </li>)}</ol>
      </article>}
      {comparison && <section aria-label="Kết quả so sánh">
        <h2>Kết quả so sánh</h2>
        {comparison.compatible ? <div className="inquiry-report-scroll" role="region" aria-label="Bảng so sánh" tabIndex={0}>
          <table>
            <thead><tr>
              <th scope="col">Chỉ tiêu</th>
              {[comparison.left, comparison.right].map((item) => <th scope="col" key={item.snapshotId}>{reportPeriod({ period_start: item.periodStart, period_end: item.periodEnd, time_zone: item.timeZone })}</th>)}
              <th scope="col">Chênh lệch (phải − trái)</th>
            </tr></thead>
            <tbody>{[
              { label: "Tổng inquiry", left: comparison.left.total, right: comparison.right.total, delta: comparison.delta.total },
              ...(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => ({
                label: statusLabels[status], left: comparison.left.byStatus[status] ?? 0, right: comparison.right.byStatus[status] ?? 0, delta: comparison.delta.byStatus[status] ?? 0,
              })),
            ].map((row) => <tr key={row.label}>
              <th scope="row">{row.label}</th><td>{row.left}</td><td>{row.right}</td><td>{row.delta > 0 ? "+" : ""}{row.delta}</td>
            </tr>)}</tbody>
          </table>
        </div> : <ul aria-label="Điều kiện báo cáo khác nhau">{comparison.differences.map(({ field, left, right }) =>
          <li key={field}><strong>{filterLabels[field] ?? field}</strong> · {filterValue(field, left, geographyNames)} → {filterValue(field, right, geographyNames)}</li>)}</ul>}
      </section>}
    </section>}
  </section>;
}
