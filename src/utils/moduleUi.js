/** Resolve filter definitions from module ui_config (supports legacy string[] `filters`). */
export function effectiveFilterDefs(ui = {}) {
  const defs = Array.isArray(ui.filterDefs) ? ui.filterDefs.filter(Boolean) : [];
  const withKeys = defs.map((d, i) => {
    if (d.filterType === "daterange") {
      const keyFrom = d.keyFrom || `${d.key || "range"}From`;
      const keyTo = d.keyTo || `${d.key || "range"}To`;
      return {
        filterType: "daterange",
        labelFrom: d.labelFrom || "From",
        labelTo: d.labelTo || "To",
        boundFieldKey: d.boundFieldKey || "",
        ...d,
        key: d.key || `range${i}`,
        keyFrom,
        keyTo
      };
    }
    return {
      filterType: d.filterType || "search",
      label: d.label || d.key || `Filter ${i + 1}`,
      placeholder: d.placeholder || "",
      options: Array.isArray(d.options) ? d.options : [],
      boundFieldKey: d.boundFieldKey || "",
      dateCompare: d.dateCompare || "exact",
      searchKeys: Array.isArray(d.searchKeys) ? d.searchKeys : [],
      ...d,
      key: d.key || `f${i}`
    };
  });

  if (withKeys.length) return withKeys;

  const legacy = Array.isArray(ui.filters) ? ui.filters : [];
  if (legacy.length) {
    const opts = [...new Set(["All", ...legacy.map(String)])];
    return [{ key: "segment", label: "Segment", filterType: "select", options: opts }];
  }

  return [];
}

export function buildInitialFilterState(filterDefs) {
  const state = {};
  for (const d of filterDefs) {
    if (d.filterType === "daterange") {
      state[d.keyFrom] = "";
      state[d.keyTo] = "";
      continue;
    }
    const k = d.key;
    if (d.filterType === "select") {
      state[k] = d.defaultValue != null ? String(d.defaultValue) : String(d.options?.[0] ?? "All");
    } else {
      state[k] = "";
    }
  }
  return state;
}

export function parseRecordData(record) {
  const raw = record?.data_json ?? record?.data;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Merge base module ui with optional tab panel overrides (all DB-driven). */
export function mergeModuleUiForTab(ui, tabKey) {
  if (!ui || typeof ui !== "object") return {};
  const baseCards = Array.isArray(ui.cards) ? [...ui.cards] : [];
  if (!tabKey || !ui.tabPanels || typeof ui.tabPanels !== "object") {
    return { ...ui, cards: baseCards };
  }
  const ov = ui.tabPanels[tabKey];
  if (!ov || typeof ov !== "object") {
    return { ...ui, cards: baseCards };
  }
  const tabCards = Array.isArray(ov.cards) ? [...ov.cards] : [];
  const ovCols = ov.tableColumns;
  const ovFilters = ov.filterDefs;
  return {
    ...ui,
    ...ov,
    filterDefs:
      Array.isArray(ovFilters) && ovFilters.length > 0 ? ovFilters : ui.filterDefs,
    tableColumns:
      Array.isArray(ovCols) && ovCols.length > 0 ? ovCols : ui.tableColumns,
    cards: [...baseCards, ...tabCards],
    pageTitle: ov.pageTitle != null ? ov.pageTitle : ui.pageTitle,
    pageSubtitle: ov.pageSubtitle != null ? ov.pageSubtitle : ui.pageSubtitle,
    tableTitle: ov.tableTitle != null ? ov.tableTitle : ui.tableTitle,
    tableSubtitle: ov.tableSubtitle != null ? ov.tableSubtitle : ui.tableSubtitle
  };
}

export function collectSearchFieldKeys(filterDefs, derivedColumns) {
  const fromDefs = filterDefs
    .filter((d) => d.filterType === "search" && Array.isArray(d.searchKeys) && d.searchKeys.length)
    .flatMap((d) => d.searchKeys);
  if (fromDefs.length) return [...new Set(fromDefs)];
  const fromCols = derivedColumns.map((c) => c.fieldKey).filter(Boolean);
  return [...new Set(fromCols)];
}

export function recordMatchesFilters(rec, filterDefs, filterState, fallbackSearchKeys) {
  const data = parseRecordData(rec);
  for (const def of filterDefs) {
    if (def.filterType === "daterange") {
      const from = filterState[def.keyFrom];
      const to = filterState[def.keyTo];
      if (!def.boundFieldKey || (!from && !to)) continue;
      const raw = data[def.boundFieldKey];
      if (raw == null || raw === "") return false;
      const normalized = String(raw).slice(0, 10);
      if (from && normalized < from) return false;
      if (to && normalized > to) return false;
      continue;
    }
    if (def.filterType === "select" && def.boundFieldKey && filterState[def.key]) {
      const sel = String(filterState[def.key]);
      const opts = Array.isArray(def.options) ? def.options.map(String) : [];
      if (!opts.length || sel === "All" || sel === "") continue;
      const raw = data[def.boundFieldKey];
      if (raw == null || String(raw) !== sel) return false;
      continue;
    }
    if (def.filterType === "search" && filterState[def.key]) {
      const q = String(filterState[def.key]).toLowerCase().trim();
      if (!q) continue;
      const keys =
        Array.isArray(def.searchKeys) && def.searchKeys.length
          ? def.searchKeys
          : fallbackSearchKeys;
      const hay = keys.map((k) => String(data[k] ?? "")).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
      continue;
    }
    if (def.filterType === "date" && def.boundFieldKey && filterState[def.key]) {
      const filterD = String(filterState[def.key]).slice(0, 10);
      const raw = data[def.boundFieldKey];
      if (raw == null || raw === "") continue;
      const normalized = String(raw).slice(0, 10);
      const cmp = def.dateCompare || "exact";
      if (cmp === "from" && normalized < filterD) return false;
      if (cmp === "to" && normalized > filterD) return false;
      if (cmp === "exact" && normalized !== filterD) return false;
    }
  }
  return true;
}

export function formatInrAmount(raw) {
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return String(raw ?? "—");
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDisplayDate(raw) {
  if (raw == null || raw === "") return "—";
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}
