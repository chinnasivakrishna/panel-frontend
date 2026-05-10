import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Download,
  Paperclip,
  Search
} from "lucide-react";
import api from "../api/client";
import PageShell from "../components/ui/PageShell";
import {
  buildInitialFilterState,
  collectSearchFieldKeys,
  effectiveFilterDefs,
  formatDisplayDate,
  formatInrAmount,
  mergeModuleUiForTab,
  parseRecordData,
  recordMatchesFilters
} from "../utils/moduleUi";

function StatusBadge({ ok }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
        ok ? "bg-emerald-500 text-white" : "bg-slate-300 text-white dark:bg-slate-600"
      }`}
      title={ok ? "OK" : "—"}
    >
      <Check size={14} strokeWidth={3} />
    </span>
  );
}

export default function DynamicModulePage({ modules = [], metrics = {} }) {
  const { moduleCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const moduleInfo = useMemo(
    () =>
      modules.find((m) => (moduleCode ? m.code === moduleCode : m.route === location.pathname)),
    [modules, moduleCode, location.pathname]
  );

  const baseUi = useMemo(() => {
    const raw = moduleInfo?.ui_config_json;
    if (raw == null || raw === "") return {};
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }, [moduleInfo?.ui_config_json]);

  const moduleTabs = Array.isArray(baseUi.moduleTabs) ? baseUi.moduleTabs.filter((t) => t && t.key) : [];
  const defaultTabKey =
    moduleTabs.find((t) => t.isDefault === true || t.isDefault === 1)?.key ||
    moduleTabs[0]?.key ||
    null;
  const [activeTabKey, setActiveTabKey] = useState(defaultTabKey);

  useEffect(() => {
    setActiveTabKey(defaultTabKey);
  }, [moduleInfo?.id, defaultTabKey]);

  const ui = useMemo(
    () => mergeModuleUiForTab(baseUi, activeTabKey),
    [baseUi, activeTabKey]
  );

  const enterprise =
    ui.enterpriseListLayout === true || ui.enterpriseListLayout === 1 || ui.enterpriseListLayout === "true";
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [filterState, setFilterState] = useState({});
  const [loadingRecords, setLoadingRecords] = useState(false);

  const filterDefs = useMemo(() => effectiveFilterDefs(ui), [ui]);

  const loadFields = useCallback(async () => {
    if (!moduleInfo?.id) return;
    const { data: f } = await api.get(`/modules/${moduleInfo.id}/fields`);
    setFields(f);
  }, [moduleInfo?.id]);

  const loadRecords = useCallback(async () => {
    if (!moduleInfo?.id) return;
    setLoadingRecords(true);
    try {
      const { data } = await api.get(`/modules/${moduleInfo.id}/records?limit=200`);
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [moduleInfo?.id]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  useEffect(() => {
    setFilterState(buildInitialFilterState(filterDefs));
  }, [moduleInfo?.id, activeTabKey, filterDefs]);

  const tableCols = Array.isArray(ui.tableColumns)
    ? ui.tableColumns.filter((c) => c && (c.heading || c.metricKey || c.fieldKey || c.format === "serial"))
    : [];
  const listedFields = fields.filter((f) => f.is_listed);

  const derivedColumns = useMemo(() => {
    const defaultOk = ["Paid", "Success", "OK", "Completed", "Settled", "true", "1"];
    if (tableCols.length > 0) {
      return tableCols.map((c, i) => ({
        heading: c.heading || c.metricKey || c.fieldKey || `Col ${i + 1}`,
        metricKey: c.metricKey || null,
        fieldKey: c.fieldKey || null,
        format: c.format || "text",
        statusOkValues:
          Array.isArray(c.statusOkValues) && c.statusOkValues.length > 0
            ? c.statusOkValues.map(String)
            : defaultOk
      }));
    }
    return listedFields.map((f) => ({
      heading: f.label,
      metricKey: null,
      fieldKey: f.field_key,
      format: "text",
      statusOkValues: defaultOk
    }));
  }, [tableCols, listedFields]);

  const needsRecords = derivedColumns.some((c) => c.fieldKey || c.format === "serial");
  const searchKeysForFilter = useMemo(
    () => collectSearchFieldKeys(filterDefs, derivedColumns),
    [filterDefs, derivedColumns]
  );

  useEffect(() => {
    if (needsRecords && moduleInfo?.id) loadRecords();
  }, [needsRecords, moduleInfo?.id, loadRecords]);

  const filteredRecords = useMemo(() => {
    if (!needsRecords) return records;
    return records.filter((rec) =>
      recordMatchesFilters(rec, filterDefs, filterState, searchKeysForFilter)
    );
  }, [records, filterDefs, filterState, searchKeysForFilter, needsRecords]);

  const setFs = (key, val) =>
    setFilterState((prev) => ({
      ...prev,
      [key]: val
    }));

  function cardMatchesFilter(card, state) {
    const vw = card.visibleWhen;
    if (vw && vw.filterKey) {
      const cur = state[vw.filterKey];
      return String(cur ?? "") === String(vw.value ?? "");
    }
    if (card.filter != null && card.filter !== "") {
      const sel = filterDefs.find((d) => d.filterType === "select");
      if (sel) return String(state[sel.key] ?? "") === String(card.filter);
    }
    return true;
  }

  const sectionCards = Array.isArray(ui.cards) ? ui.cards : [];
  const visibleCards = sectionCards.filter((c) => cardMatchesFilter(c, filterState));

  function renderMetricRows(card) {
    const rows = Array.isArray(card.metricRows) ? card.metricRows : [];
    if (!rows.length) return null;
    return (
      <dl className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
        {rows.map((r, ri) => {
          const v =
            r.metricKey && metrics && Object.prototype.hasOwnProperty.call(metrics, r.metricKey)
              ? String(metrics[r.metricKey])
              : "—";
          return (
            <div key={`${r.label}-${ri}`} className="flex items-center justify-between gap-3 text-xs">
              <dt className="text-[var(--text-secondary)]">{r.label || r.metricKey}</dt>
              <dd className="font-semibold tabular-nums text-[var(--text-primary)]">{v}</dd>
            </div>
          );
        })}
      </dl>
    );
  }

  const filterLabelClass =
    "block text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-1.5";
  const filterInputClass =
    "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--root-color)]/30";

  function renderFilterControl(def) {
    if (def.filterType === "daterange") {
      return (
        <div key={def.key} className="flex flex-wrap gap-4 items-end">
          <label className="min-w-[160px] flex-1">
            <span className={filterLabelClass}>{(def.labelFrom || "FROM DATE").toUpperCase()}</span>
            <input
              type="date"
              className={filterInputClass}
              value={filterState[def.keyFrom] ?? ""}
              onChange={(e) => setFs(def.keyFrom, e.target.value)}
            />
          </label>
          <label className="min-w-[160px] flex-1">
            <span className={filterLabelClass}>{(def.labelTo || "TO DATE").toUpperCase()}</span>
            <input
              type="date"
              className={filterInputClass}
              value={filterState[def.keyTo] ?? ""}
              onChange={(e) => setFs(def.keyTo, e.target.value)}
            />
          </label>
        </div>
      );
    }

    const k = def.key;
    const lbl = <span className={filterLabelClass}>{(def.label || k).toUpperCase()}</span>;

    switch (def.filterType) {
      case "select":
        return (
          <label key={k} className="min-w-[140px]">
            {lbl}
            <select className={filterInputClass} value={filterState[k] ?? ""} onChange={(e) => setFs(k, e.target.value)}>
              {(def.options?.length ? def.options : ["All"]).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        );
      case "date":
      case "time":
      case "datetime":
        return (
          <label key={k} className="min-w-[160px]">
            {lbl}
            <input
              type={
                def.filterType === "date" ? "date" : def.filterType === "time" ? "time" : "datetime-local"
              }
              className={filterInputClass}
              value={filterState[k] ?? ""}
              onChange={(e) => setFs(k, e.target.value)}
            />
          </label>
        );
      default:
        return (
          <label key={k} className="min-w-[220px] flex-1 max-w-md">
            {lbl}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
                aria-hidden
              />
              <input
                type="search"
                className={`${filterInputClass} pl-9`}
                placeholder={def.placeholder || "Search…"}
                value={filterState[k] ?? ""}
                onChange={(e) => setFs(k, e.target.value)}
              />
            </div>
          </label>
        );
    }
  }

  function rawCellValue(col, rec) {
    if (col.format === "serial") return "";
    if (col.metricKey) {
      const v = metrics[col.metricKey];
      return v != null && v !== "" ? v : "—";
    }
    if (col.fieldKey && rec) {
      const data = parseRecordData(rec);
      const raw = data[col.fieldKey];
      return raw != null && raw !== "" ? raw : "—";
    }
    return "—";
  }

  function renderCell(col, rec, rowIndex) {
    if (col.format === "serial") {
      return <span className="tabular-nums text-[var(--text-secondary)]">{rowIndex + 1}</span>;
    }
    const raw = rawCellValue(col, rec);
    switch (col.format) {
      case "currency_inr":
        return <span className="tabular-nums font-medium text-[var(--text-primary)]">{formatInrAmount(raw)}</span>;
      case "date_iso":
        return <span className="tabular-nums">{formatDisplayDate(raw)}</span>;
      case "status_badge": {
        const ok = col.statusOkValues.some((x) => String(x).toLowerCase() === String(raw).toLowerCase());
        return <StatusBadge ok={ok} />;
      }
      case "icon_attach":
        return (
          <button
            type="button"
            className="text-[var(--root-color)] hover:opacity-80 p-1 rounded"
            title="Attachment"
            aria-label="Attachment"
          >
            <Paperclip size={18} />
          </button>
        );
      default:
        return <span className="text-[var(--text-primary)]">{String(raw)}</span>;
    }
  }

  const showEmptyTableHint = !derivedColumns.length;
  const metricOnlyRow =
    derivedColumns.every((c) => c.metricKey && !c.fieldKey && c.format !== "serial") &&
    derivedColumns.some((c) => c.metricKey);
  const dataRows = metricOnlyRow ? [null] : filteredRecords;

  function exportCsv() {
    const cols = derivedColumns.filter((c) => c.format !== "icon_attach");
    const lines = [
      cols.map((c) => `"${(c.heading || "").replace(/"/g, '""')}"`).join(",")
    ];
    for (let i = 0; i < dataRows.length; i++) {
      const rec = dataRows[i];
      const row = cols.map((c) => {
        const v = rawCellValue(c, rec);
        const s = c.format === "serial" ? String(i + 1) : String(v ?? "");
        return `"${s.replace(/"/g, '""')}"`;
      });
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(ui.pageTitle || "export").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const breadcrumbParent = ui.breadcrumbParentLabel || "Dashboard";
  const breadcrumbRoute = ui.breadcrumbParentRoute || "/dashboard";
  const pageTitle = ui.pageTitle || moduleInfo?.name || "Module";
  const showExport =
    ui.showExport === true || ui.showExport === 1 || ui.showExport === "true";

  const filterBar =
    filterDefs.length > 0 || showExport ? (
      <div
        className={
          enterprise
            ? "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-4 py-4 shadow-sm"
            : "rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-1)]"
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
          <div className="flex flex-wrap gap-4 flex-1 items-end">{filterDefs.map((d) => renderFilterControl(d))}</div>
          {showExport && (
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Download size={18} className="text-[var(--root-color)]" />
              {ui.exportButtonLabel || "Export"}
            </button>
          )}
        </div>
      </div>
    ) : null;

  const tabStrip =
    moduleTabs.length > 1 ? (
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-0 overflow-x-auto">
          {moduleTabs.map((t) => {
            const active = (activeTabKey || defaultTabKey) === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTabKey(t.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  active
                    ? "border-[var(--root-color)] text-[var(--root-color)]"
                    : "border-transparent text-slate-500 hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label || t.key}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  const breadcrumbs = enterprise ? (
    <nav className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mb-1">
      <button
        type="button"
        onClick={() => navigate(breadcrumbRoute)}
        className="hover:text-[var(--root-color)]"
      >
        {breadcrumbParent}
      </button>
      <ChevronRight size={14} className="shrink-0 opacity-60" />
      <span className="text-[var(--text-primary)] font-medium">{pageTitle}</span>
    </nav>
  ) : null;

  const inner = !moduleInfo ? (
    <div className="card-elev rounded-xl p-4 text-sm text-[var(--text-secondary)]">Module not found.</div>
  ) : (
    <>
      {enterprise && (breadcrumbs || tabStrip) && (
        <div className="space-y-0 mb-4">
          {breadcrumbs}
          {tabStrip}
        </div>
      )}

      {!enterprise && moduleTabs.length > 1 && <div className="mb-4">{tabStrip}</div>}

      {visibleCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleCards.map((c, idx) => (
            <div key={idx} className="card-elev rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{c.title || `Card ${idx + 1}`}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">{c.subtitle || ""}</p>
              {renderMetricRows(c)}
            </div>
          ))}
        </div>
      )}

      {filterBar}

      <div
        className={
          enterprise
            ? "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 overflow-hidden shadow-sm"
            : "card-elev rounded-xl p-4 overflow-auto"
        }
      >
        {(ui.tableTitle || ui.tableSubtitle) && (
          <div className={enterprise ? "px-4 pt-4 pb-2" : ""}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
              {ui.tableTitle || "Table"}
            </h3>
            {ui.tableSubtitle && (
              <p className="text-xs text-[var(--text-muted)]">{ui.tableSubtitle}</p>
            )}
          </div>
        )}
        {loadingRecords && (
          <p className={`text-xs text-[var(--text-muted)] ${enterprise ? "px-4" : "mb-2"}`}>Loading records…</p>
        )}
        <div className={enterprise ? "overflow-x-auto" : ""}>
          <table className={`w-full text-sm ${enterprise ? "" : ""}`}>
            <thead>
              <tr
                className={`text-left text-[var(--text-secondary)] ${
                  enterprise ? "bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700" : ""
                }`}
              >
                {derivedColumns.map((c, ci) => (
                  <th key={`${c.heading}-${ci}`} className={`py-3 px-4 font-semibold text-xs uppercase tracking-wide`}>
                    {c.heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showEmptyTableHint ? (
                <tr className="border-t border-[var(--border)]">
                  <td className="py-3 px-4 text-[var(--text-muted)] text-sm">
                    No columns configured. Add table columns in Settings (or listed fields).
                  </td>
                </tr>
              ) : (
                dataRows.map((rec, ri) => (
                  <tr
                    key={rec?.id ?? `m-${ri}`}
                    className={`border-t border-slate-100 dark:border-slate-800 ${
                      enterprise && ri % 2 === 1 ? "bg-slate-50/80 dark:bg-slate-800/30" : ""
                    }`}
                  >
                    {derivedColumns.map((c, ci) => (
                      <td key={`${c.heading}-${ci}`} className="py-3 px-4 align-middle">
                        {renderCell(c, rec, ri)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!showEmptyTableHint && needsRecords && filteredRecords.length === 0 && !loadingRecords && (
                <tr className="border-t border-[var(--border)]">
                  <td
                    className="py-3 px-4 text-[var(--text-muted)] text-sm"
                    colSpan={Math.max(derivedColumns.length, 1)}
                  >
                    No rows match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  if (enterprise) {
    return (
      <div className="max-w-6xl space-y-4">
        {!moduleInfo ? (
          inner
        ) : (
          <>
            {!breadcrumbs && !tabStrip && null}
            {inner}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <PageShell
        title={pageTitle}
        subtitle={ui.pageSubtitle || "Configured from database (Settings → module UI)."}
      >
        {moduleTabs.length > 1 && <div className="-mt-2 mb-2">{tabStrip}</div>}
        {inner}
      </PageShell>
    </div>
  );
}
