import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import api from "../api/client";
import { resolveAssetUrl } from "../utils/urls";

const FILTER_TYPES = ["search", "select", "date", "time", "datetime", "daterange"];

const COLUMN_FORMATS = [
  { value: "text", label: "Text" },
  { value: "serial", label: "S.No (row #)" },
  { value: "currency_inr", label: "Currency (₹)" },
  { value: "date_iso", label: "Date (ISO)" },
  { value: "status_badge", label: "Status (check badge)" },
  { value: "icon_attach", label: "Icon (paperclip)" }
];

function FoldSection({ title, hint, defaultOpen = false, children }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-900/30 overflow-hidden"
    >
      <summary className="cursor-pointer select-none flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 list-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={18}
          className="shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-90"
          aria-hidden
        />
        <span>{title}</span>
        {hint ? (
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 basis-full sm:basis-auto">
            {hint}
          </span>
        ) : null}
      </summary>
      <div className="px-3 pb-3 pt-2 space-y-3 border-t border-slate-100 dark:border-slate-700">{children}</div>
    </details>
  );
}

function ModuleTableColumnsEditor({ inputBase, fkOpts, metricChoices, columns, commitColumns }) {
  const list = Array.isArray(columns) ? columns : [];
  return (
    <>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Map headings to <strong>metric_key</strong> or record <strong>field key</strong>. Used for the table under this scope (default tab vs selected tab).
      </p>
      {list.map((col, cidx) => {
        const fmt = col.format || "text";
        const replaceRow = (partial) => {
          const tc = [...list];
          tc[cidx] = { ...tc[cidx], ...partial };
          commitColumns(tc);
        };
        return (
          <div key={cidx} className="rounded border border-slate-200 dark:border-slate-600 p-2 space-y-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
              <input
                className={`${inputBase} lg:col-span-3`}
                placeholder="Column heading"
                value={col.heading || ""}
                onChange={(e) => replaceRow({ heading: e.target.value })}
              />
              <select
                className={`${inputBase} lg:col-span-3`}
                value={fmt}
                onChange={(e) => {
                  const f = e.target.value;
                  const next = { format: f };
                  if (f === "serial") {
                    next.fieldKey = undefined;
                    next.metricKey = undefined;
                  }
                  replaceRow(next);
                }}
              >
                {COLUMN_FORMATS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                className={`${inputBase} lg:col-span-3`}
                value={col.metricKey || ""}
                disabled={fmt === "serial"}
                onChange={(e) =>
                  replaceRow({
                    metricKey: e.target.value || undefined,
                    fieldKey: e.target.value ? undefined : list[cidx]?.fieldKey
                  })
                }
              >
                <option value="">Metric (optional)</option>
                {metricChoices.map((mk) => (
                  <option key={mk} value={mk}>{mk}</option>
                ))}
              </select>
              <select
                className={`${inputBase} lg:col-span-2`}
                value={col.fieldKey || ""}
                disabled={fmt === "serial"}
                onChange={(e) =>
                  replaceRow({
                    fieldKey: e.target.value || undefined,
                    metricKey: e.target.value ? undefined : list[cidx]?.metricKey
                  })
                }
              >
                <option value="">Field key</option>
                {fkOpts.map((f) => (
                  <option key={f.id || f.field_key} value={f.field_key}>{f.label || f.field_key}</option>
                ))}
              </select>
              <button
                type="button"
                className="px-3 py-2 rounded bg-rose-600 text-white text-xs lg:col-span-1"
                onClick={() => {
                  const tc = [...list];
                  tc.splice(cidx, 1);
                  commitColumns(tc);
                }}
              >
                ✕
              </button>
            </div>
            {fmt === "status_badge" && (
              <input
                className={inputBase}
                placeholder='OK values (comma), e.g. Paid,Success,Settled'
                value={(col.statusOkValues || []).join(", ")}
                onChange={(e) => {
                  const vals = e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean);
                  replaceRow({ statusOkValues: vals });
                }}
              />
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs"
        onClick={() =>
          commitColumns([...list, { heading: "", format: "text", metricKey: "", fieldKey: "" }])
        }
      >
        Add table column
      </button>
    </>
  );
}

function legacyFiltersToDefs(filters) {
  const opts = [...new Set(["All", ...filters.filter(Boolean)])];
  return [{ key: "segment", label: "Segment", filterType: "select", options: opts }];
}

function ensureEditorFilterDefs(cfg) {
  const c = { ...cfg };
  if (Array.isArray(c.filterDefs) && c.filterDefs.length) return [...c.filterDefs];
  if (Array.isArray(c.filters) && c.filters.length) return legacyFiltersToDefs(c.filters);
  return [
    { key: "q", label: "Search", filterType: "search", placeholder: "Search…", options: [] }
  ];
}

function filterDefsFromCfgObject(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};
  if (Array.isArray(c.filterDefs) && c.filterDefs.length) return c.filterDefs.map((d) => ({ ...d }));
  return ensureEditorFilterDefs(c);
}

function finalizeModuleUi(cfg) {
  const next = typeof cfg === "object" && cfg ? { ...cfg } : {};
  if (Array.isArray(next.filterDefs) && next.filterDefs.length) delete next.filters;
  if (next.filterDefs) {
    next.filterDefs = next.filterDefs.map((d, i) => {
      const merged = typeof d === "object" && d ? d : {};
      if (merged.filterType === "daterange") {
        const k = String(merged.key || `range_${i}`);
        return {
          ...merged,
          filterType: "daterange",
          key: k,
          keyFrom: String(merged.keyFrom || `${k}From`),
          keyTo: String(merged.keyTo || `${k}To`),
          labelFrom: merged.labelFrom || "From date",
          labelTo: merged.labelTo || "To date",
          boundFieldKey: merged.boundFieldKey || ""
        };
      }
      return {
        ...merged,
        filterType: merged.filterType || "search",
        label: merged.label || merged.key || `Filter ${i + 1}`,
        placeholder: merged.placeholder || "",
        options: Array.isArray(merged.options) ? merged.options : [],
        boundFieldKey: merged.boundFieldKey || "",
        dateCompare: merged.dateCompare || "exact",
        searchKeys: Array.isArray(merged.searchKeys) ? merged.searchKeys : [],
        key: String(merged.key || `f_${i}`)
      };
    });
  }
  return next;
}

function MetricsRowEditable({ row, inputBase, onSave, onRemove }) {
  const [value, setValue] = useState(row.value_text || "");
  const [desc, setDesc] = useState(row.description || "");
  useEffect(() => {
    setValue(row.value_text || "");
    setDesc(row.description || "");
  }, [row.metric_key, row.value_text, row.description]);

  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 p-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
      <div className="md:col-span-2 flex items-center pt-3">
        <code className="text-xs bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded">{row.metric_key}</code>
      </div>
      <input
        className={`${inputBase} md:col-span-3`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Displayed value"
      />
      <input
        className={`${inputBase} md:col-span-5`}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (hint for admins)"
      />
      <div className="md:col-span-2 flex gap-2 flex-wrap pt-3">
        <button
          type="button"
          className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs"
          onClick={() => onSave(row.metric_key, value, desc)}
        >
          Save
        </button>
        <button type="button" className="px-3 py-1.5 rounded bg-rose-600 text-white text-xs" onClick={onRemove}>
          Delete
        </button>
      </div>
    </div>
  );
}

function parseObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default function SettingsPage({ panelConfig, onUpdated }) {
  const initial = useMemo(
    () => ({
      app_name: panelConfig?.config?.app_name || "",
      logo_url: panelConfig?.config?.logo_url || "",
      color_root: panelConfig?.config?.color_root || "#4F46E5",
      color_secondary: panelConfig?.config?.color_secondary || "#06B6D4",
      color_tertiary: panelConfig?.config?.color_tertiary || "#F59E0B",
      support_widget_enabled: panelConfig?.config?.support_widget_enabled ?? "true"
    }),
    [panelConfig]
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [homeCards, setHomeCards] = useState([]);
  const [navItems, setNavItems] = useState([]);
  const [modules, setModules] = useState([]);
  const [metricsList, setMetricsList] = useState([]);
  const [moduleFieldsById, setModuleFieldsById] = useState({});
  const [newMetricKey, setNewMetricKey] = useState("");
  const [newMetricValue, setNewMetricValue] = useState("");
  const [metaMsg, setMetaMsg] = useState("");

  useEffect(() => {
    setForm(initial);
    loadUiMeta();
  }, [initial]);

  useEffect(() => {
    let alive = true;
    const ids = (modules || []).map((m) => m.id).join(",");
    if (!ids) return undefined;
    (async () => {
      const entries = await Promise.all(
        modules.map(async (m) => {
          try {
            const { data } = await api.get(`/admin/modules/${m.id}/fields`);
            return [m.id, Array.isArray(data) ? data : []];
          } catch {
            return [m.id, []];
          }
        })
      );
      if (!alive) return;
      setModuleFieldsById(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules.map((m) => m.id).join("|")]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.patch("/config/panel", { config: form });
      setMessage("Saved.");
      onUpdated?.();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    "mt-2 w-full rounded-lg border px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-root/40 focus:border-root/60 " +
    "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-700 dark:focus:ring-root/30";

  const cardBase =
    "rounded-xl border bg-white p-4 shadow-sm " +
    "border-slate-200 dark:border-slate-700 dark:bg-slate-800/70";

  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      // Let the browser set multipart boundaries automatically
      const { data } = await api.post("/config/panel/logo", fd);
      set("logo_url", data.logoUrl);
      setMessage("Logo uploaded. Click Save changes to apply.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const loadUiMeta = async () => {
    try {
      const [hc, nav, mods, mt] = await Promise.all([
        api.get("/admin/home-cards"),
        api.get("/admin/nav-items"),
        api.get("/admin/modules"),
        api.get("/admin/metrics").catch(() => ({ data: [] }))
      ]);
      setHomeCards(hc.data || []);
      setNavItems(nav.data || []);
      setModules(mods.data || []);
      setMetricsList(mt.data || []);
    } catch {
      setMetaMsg("Unable to load advanced UI settings.");
    }
  };

  const updateHomeCard = async (id, patch) => {
    await api.patch(`/admin/home-cards/${id}`, patch);
    await loadUiMeta();
    onUpdated?.();
  };
  const deleteHomeCard = async (id) => {
    await api.delete(`/admin/home-cards/${id}`);
    await loadUiMeta();
    onUpdated?.();
  };
  const addHomeCard = async () => {
    await api.post("/admin/home-cards", {
      code: `card_${Date.now()}`,
      title: "New Card",
      subtitle: "Configured from settings",
      accent: "root",
      enabled: true,
      sortOrder: homeCards.length + 1,
      config: { rows: [{ label: "Metric", value: "0" }] }
    });
    await loadUiMeta();
    onUpdated?.();
  };

  const updateNav = async (id, patch) => {
    await api.patch(`/admin/nav-items/${id}`, patch);
    await loadUiMeta();
    onUpdated?.();
  };
  const addNav = async () => {
    await api.post("/admin/nav-items", {
      label: "New Item",
      icon: "CircleDot",
      route: `/new-${Date.now()}`,
      position: "top",
      sortOrder: 99,
      isActive: true
    });
    await loadUiMeta();
    onUpdated?.();
  };
  const deleteNav = async (id) => {
    await api.delete(`/admin/nav-items/${id}`);
    await loadUiMeta();
    onUpdated?.();
  };

  const updateModuleUi = async (id, uiConfig) => {
    await api.patch(`/admin/modules/${id}`, { uiConfig });
    await loadUiMeta();
    onUpdated?.();
  };

  const setHomeCardValue = (id, key, value) => {
    setHomeCards((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const setHomeCardRows = (id, rows) => {
    setHomeCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const cfg = parseObject(c.config_json, { rows: [] });
        return { ...c, config_json: { ...cfg, rows } };
      })
    );
  };

  const setModuleUi = (id, key, value) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const cfg = parseObject(m.ui_config_json, {});
        return { ...m, ui_config_json: { ...cfg, [key]: value } };
      })
    );
  };

  const setModuleCards = (id, cards) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const cfg = parseObject(m.ui_config_json, {});
        return { ...m, ui_config_json: { ...cfg, cards } };
      })
    );
  };

  const patchModuleUi = (id, patchFn) =>
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const cfg = parseObject(m.ui_config_json, {});
        return { ...m, ui_config_json: patchFn(cfg) };
      })
    );

  const patchTabPanel = (moduleId, tabKey, updater) => {
    patchModuleUi(moduleId, (cfg) => {
      const raw = cfg.tabPanels;
      const tp =
        raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
      const cur = tp[tabKey] && typeof tp[tabKey] === "object" ? { ...tp[tabKey] } : {};
      tp[tabKey] = updater(cur);
      return { ...cfg, tabPanels: tp };
    });
  };

  const persistMetricPatch = async (metricKey, value, description) => {
    await api.patch(`/admin/metrics/${encodeURIComponent(metricKey)}`, {
      value,
      description
    });
    await loadUiMeta();
    onUpdated?.();
  };

  const createMetricKey = async () => {
    if (!newMetricKey.trim()) return;
    await api.post("/admin/metrics", {
      metricKey: newMetricKey.trim(),
      value: newMetricValue,
      description: ""
    });
    setNewMetricKey("");
    setNewMetricValue("");
    await loadUiMeta();
    onUpdated?.();
    setMetaMsg("Metric key created.");
  };

  const removeMetricKey = async (metricKey) => {
    await api.delete(`/admin/metrics/${encodeURIComponent(metricKey)}`);
    await loadUiMeta();
    onUpdated?.();
  };

  const metricChoices = metricsList.map((r) => r.metric_key).filter(Boolean);

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-semibold text-root">Settings</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Organization branding & UI configuration (loaded from `org_config`).
      </p>

      <form onSubmit={save} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cardBase}>
            <label className="text-sm font-medium text-slate-800 dark:text-slate-100">App name</label>
            <input
              className={inputBase}
              value={form.app_name}
              onChange={(e) => set("app_name", e.target.value)}
              placeholder="Acme Admin"
            />
          </div>

          <div className={cardBase}>
            <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Logo</label>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                {form.logo_url ? (
                  <img src={resolveAssetUrl(form.logo_url)} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-root font-semibold">EP</span>
                )}
              </div>
              <div className="flex-1">
                <input
                  className="block w-full text-sm text-slate-700 dark:text-slate-200
                    file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium
                    file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200
                    dark:file:bg-slate-900 dark:file:text-slate-100 dark:hover:file:bg-slate-950"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => uploadLogo(e.target.files?.[0])}
                  disabled={uploading}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Upload PNG/JPG/WebP/SVG (max 2MB). Stored on server and saved in DB (`org_config.logo_url`).
                </p>
              </div>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-800 dark:text-slate-100">
              Logo URL (optional override)
            </label>
            <input
              className={inputBase}
              value={form.logo_url}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="/logos/acme.svg"
            />
          </div>
        </div>

        <div className={cardBase}>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Theme palette</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Root</label>
              <div className="mt-2 flex gap-2 items-center">
                <input
                  type="color"
                  value={form.color_root}
                  onChange={(e) => set("color_root", e.target.value)}
                  className="h-11 w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
                <input className={inputBase} value={form.color_root} onChange={(e) => set("color_root", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Secondary</label>
              <div className="mt-2 flex gap-2 items-center">
                <input
                  type="color"
                  value={form.color_secondary}
                  onChange={(e) => set("color_secondary", e.target.value)}
                  className="h-11 w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
                <input className={inputBase} value={form.color_secondary} onChange={(e) => set("color_secondary", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Tertiary</label>
              <div className="mt-2 flex gap-2 items-center">
                <input
                  type="color"
                  value={form.color_tertiary}
                  onChange={(e) => set("color_tertiary", e.target.value)}
                  className="h-11 w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
                <input className={inputBase} value={form.color_tertiary} onChange={(e) => set("color_tertiary", e.target.value)} />
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Colors apply instantly after reload (they are injected as CSS variables from `/api/config/panel`).
          </p>
        </div>

        <div className={cardBase}>
          <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Customer service widget</label>
          <select
            className={`${inputBase} appearance-none`}
            value={String(form.support_widget_enabled)}
            onChange={(e) => set("support_widget_enabled", e.target.value)}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={saving || uploading}
            className="bg-root text-white px-5 py-3 rounded-lg disabled:opacity-60 shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-root/40"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {message && <span className="text-sm text-slate-600 dark:text-slate-200">{message}</span>}
        </div>
      </form>

      <div className="mt-8 space-y-4">
        <div className={cardBase}>
          <FoldSection title="Home Cards (DB-driven divs)" hint="Expand/collapse — reduces scrolling." defaultOpen>
            <div className="flex justify-end">
              <button type="button" className="px-3 py-2 rounded bg-[var(--root-color)] text-white text-sm" onClick={addHomeCard}>Add Card</button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure title/subtitle/accent and sub-rows shown on Home cards.</p>
            <div className="space-y-3">
            {homeCards.map((card) => (
              <div key={card.id} className="rounded border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input className={inputBase} placeholder="Card title" value={card.title || ""} onChange={(e) => setHomeCardValue(card.id, "title", e.target.value)} />
                  <input className={inputBase} placeholder="Card subtitle" value={card.subtitle || ""} onChange={(e) => setHomeCardValue(card.id, "subtitle", e.target.value)} />
                  <select className={inputBase} value={card.accent || "root"} onChange={(e) => setHomeCardValue(card.id, "accent", e.target.value)}>
                    <option value="root">root</option>
                    <option value="secondary">secondary</option>
                    <option value="tertiary">tertiary</option>
                  </select>
                  <input
                    className={inputBase}
                    type="number"
                    placeholder="Sort"
                    value={card.sort_order || 0}
                    onChange={(e) => setHomeCardValue(card.id, "sort_order", Number(e.target.value || 0))}
                  />
                </div>

                <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                  <p className="text-xs text-slate-500 mb-2">
                    Card Rows — tie a row to{" "}
                    <code className="text-[10px]">metric_key</code> so the Dashboard shows DB values automatically.
                  </p>
                  {(parseObject(card.config_json, { rows: [] }).rows || []).map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-2 mb-2">
                      <input
                        className={`${inputBase} lg:col-span-2`}
                        placeholder="Label"
                        value={row.label || ""}
                        onChange={(e) => {
                          const rows = [...(parseObject(card.config_json, { rows: [] }).rows || [])];
                          rows[idx] = { ...rows[idx], label: e.target.value };
                          setHomeCardRows(card.id, rows);
                        }}
                      />
                      <input
                        className={`${inputBase} lg:col-span-2`}
                        placeholder="Static value fallback"
                        value={row.value || ""}
                        onChange={(e) => {
                          const rows = [...(parseObject(card.config_json, { rows: [] }).rows || [])];
                          rows[idx] = { ...rows[idx], value: e.target.value };
                          setHomeCardRows(card.id, rows);
                        }}
                      />
                      <select
                        className={`${inputBase} lg:col-span-3`}
                        value={row.metricKey || ""}
                        onChange={(e) => {
                          const rows = [...(parseObject(card.config_json, { rows: [] }).rows || [])];
                          rows[idx] = { ...rows[idx], metricKey: e.target.value || undefined };
                          setHomeCardRows(card.id, rows);
                        }}
                      >
                        <option value="">No metric binding</option>
                        {metricChoices.map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                      <input
                        className={`${inputBase} lg:col-span-3`}
                        type="number"
                        placeholder="Delta (optional)"
                        value={typeof row.delta === "number" ? row.delta : ""}
                        onChange={(e) => {
                          const rows = [...(parseObject(card.config_json, { rows: [] }).rows || [])];
                          rows[idx] = {
                            ...rows[idx],
                            delta: e.target.value === "" ? undefined : Number(e.target.value)
                          };
                          setHomeCardRows(card.id, rows);
                        }}
                      />
                      <button
                        className="px-3 py-2 rounded bg-rose-600 text-white text-xs lg:col-span-2"
                        onClick={() => {
                          const rows = [...(parseObject(card.config_json, { rows: [] }).rows || [])];
                          rows.splice(idx, 1);
                          setHomeCardRows(card.id, rows);
                        }}
                      >
                        Remove Row
                      </button>
                    </div>
                  ))}
                  <button
                    className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs"
                    onClick={() => {
                      const rows = [...(parseObject(card.config_json, { rows: [] }).rows || [])];
                      rows.push({ label: "Metric", value: "0" });
                      setHomeCardRows(card.id, rows);
                    }}
                  >
                    Add Row
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs"
                    onClick={async () => {
                      const cfg = parseObject(card.config_json, { rows: [] });
                      await updateHomeCard(card.id, {
                        title: card.title,
                        subtitle: card.subtitle,
                        accent: card.accent,
                        sortOrder: Number(card.sort_order || 0),
                        config: cfg
                      });
                      setMetaMsg("Home card updated");
                    }}
                  >
                    Save Card
                  </button>
                  <button className="px-3 py-1.5 rounded bg-rose-600 text-white text-xs" onClick={() => deleteHomeCard(card.id)}>Delete</button>
                </div>
              </div>
            ))}
            </div>
          </FoldSection>
        </div>

        <div className={cardBase}>
          <FoldSection title="Organization metrics" hint="KPI keys stored in MariaDB." defaultOpen={false}>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400 -mt-1 mb-2">
            Values stored in MariaDB (<code className="text-[10px]">org_metric_values</code>). Bind modules and home rows by{" "}
            <code className="text-[10px]">metric_key</code>.
          </p>
          <div className="mt-4 space-y-2">
            {metricsList.map((r) => (
              <MetricsRowEditable
                key={r.metric_key}
                row={r}
                inputBase={inputBase}
                onSave={(key, val, descr) =>
                  persistMetricPatch(key, val, descr).then(() => setMetaMsg("Metric updated"))
                }
                onRemove={() =>
                  removeMetricKey(r.metric_key).then(() => setMetaMsg("Metric removed"))
                }
              />
            ))}
            {!metricsList.length && (
              <p className="text-xs text-slate-500">No metrics defined yet.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 items-end border-t border-slate-200 dark:border-slate-700 pt-4">
            <input
              className={`${inputBase} flex-1 min-w-[160px]`}
              placeholder="New metric_key (e.g. sales_today)"
              value={newMetricKey}
              onChange={(e) => setNewMetricKey(e.target.value)}
            />
            <input
              className={`${inputBase} flex-1 min-w-[160px]`}
              placeholder="Initial value shown in UI"
              value={newMetricValue}
              onChange={(e) => setNewMetricValue(e.target.value)}
            />
            <button type="button" className="px-4 py-2 rounded bg-root text-white text-sm shrink-0" onClick={() => createMetricKey()}>
              Add metric key
            </button>
          </div>
          </FoldSection>
        </div>

        <div className={cardBase}>
          <FoldSection title="Sidebar Items" hint="Routes shown in the left rail." defaultOpen={false}>
            <div className="flex justify-end">
              <button type="button" className="px-3 py-2 rounded bg-[var(--root-color)] text-white text-sm" onClick={addNav}>Add Sidebar Item</button>
            </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure what items appear in sidebar.</p>
          <div className="space-y-2">
            {navItems.map((item) => (
              <div key={item.id} className="rounded border border-slate-200 dark:border-slate-700 p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input className={inputBase} value={item.label} onChange={(e) => setNavItems((p) => p.map((x) => x.id === item.id ? { ...x, label: e.target.value } : x))} />
                  <input className={inputBase} value={item.route} onChange={(e) => setNavItems((p) => p.map((x) => x.id === item.id ? { ...x, route: e.target.value } : x))} />
                  <select className={inputBase} value={item.position} onChange={(e) => setNavItems((p) => p.map((x) => x.id === item.id ? { ...x, position: e.target.value } : x))}>
                    <option value="top">top</option>
                    <option value="bottom">bottom</option>
                  </select>
                  <input className={inputBase} type="number" value={item.sort_order || 0} onChange={(e) => setNavItems((p) => p.map((x) => x.id === item.id ? { ...x, sort_order: Number(e.target.value || 0) } : x))} />
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs" onClick={() => updateNav(item.id, { label: item.label, route: item.route, position: item.position, sortOrder: item.sort_order })}>Save Item</button>
                  <button className="px-3 py-1.5 rounded bg-rose-600 text-white text-xs" onClick={() => deleteNav(item.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          </FoldSection>
        </div>

        <div className={cardBase}>
          <FoldSection
            title="Page Layout (modules)"
            hint="Open each module, then expand the subsection you need."
            defaultOpen
          >
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
            Shared top cards stay the same when switching tabs; per-tab extras and columns are configured below.
          </p>
          <div className="mt-3 space-y-3">
            {modules.map((m) => (
              <div key={m.id} className="rounded border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                <FoldSection title="Page & table titles" hint="Default tab headings." defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input className={inputBase} placeholder="Page title" value={parseObject(m.ui_config_json, {}).pageTitle || ""} onChange={(e) => setModuleUi(m.id, "pageTitle", e.target.value)} />
                  <input className={inputBase} placeholder="Page subtitle" value={parseObject(m.ui_config_json, {}).pageSubtitle || ""} onChange={(e) => setModuleUi(m.id, "pageSubtitle", e.target.value)} />
                  <input className={inputBase} placeholder="Table title" value={parseObject(m.ui_config_json, {}).tableTitle || ""} onChange={(e) => setModuleUi(m.id, "tableTitle", e.target.value)} />
                  <input className={inputBase} placeholder="Table subtitle" value={parseObject(m.ui_config_json, {}).tableSubtitle || ""} onChange={(e) => setModuleUi(m.id, "tableSubtitle", e.target.value)} />
                </div>
                </FoldSection>

                <FoldSection title="Enterprise list & tabs" hint="Breadcrumb, tabs, export — collapsible." defaultOpen={false}>
                <div className="rounded border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/20">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    On the live page, the filter toolbar appears <strong>below</strong> shared/top cards.
                  </p>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={
                        !!parseObject(m.ui_config_json, {}).enterpriseListLayout &&
                        parseObject(m.ui_config_json, {}).enterpriseListLayout !== "false"
                      }
                      onChange={(e) => setModuleUi(m.id, "enterpriseListLayout", e.target.checked)}
                    />
                    Enable enterprise list layout
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      className={inputBase}
                      placeholder="Breadcrumb parent label (e.g. Dashboard)"
                      value={parseObject(m.ui_config_json, {}).breadcrumbParentLabel || ""}
                      onChange={(e) => setModuleUi(m.id, "breadcrumbParentLabel", e.target.value)}
                    />
                    <input
                      className={inputBase}
                      placeholder="Breadcrumb parent route (e.g. /dashboard)"
                      value={parseObject(m.ui_config_json, {}).breadcrumbParentRoute || ""}
                      onChange={(e) => setModuleUi(m.id, "breadcrumbParentRoute", e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={
                        !!parseObject(m.ui_config_json, {}).showExport &&
                        parseObject(m.ui_config_json, {}).showExport !== "false"
                      }
                      onChange={(e) => setModuleUi(m.id, "showExport", e.target.checked)}
                    />
                    Show Export button (downloads CSV from current table)
                  </label>
                  <input
                    className={inputBase}
                    placeholder="Export button label"
                    value={parseObject(m.ui_config_json, {}).exportButtonLabel || ""}
                    onChange={(e) => setModuleUi(m.id, "exportButtonLabel", e.target.value)}
                  />
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">Module tabs (optional)</p>
                    {(parseObject(m.ui_config_json, {}).moduleTabs || []).map((tab, ti) => (
                      <div key={ti} className="flex flex-wrap gap-2 items-center">
                        <input
                          className={`${inputBase} flex-1 min-w-[100px]`}
                          placeholder="tab key (slug)"
                          value={tab.key || ""}
                          onChange={(e) =>
                            patchModuleUi(m.id, (cfg) => {
                              const tabs = [...(cfg.moduleTabs || [])];
                              tabs[ti] = { ...tabs[ti], key: e.target.value };
                              return { ...cfg, moduleTabs: tabs };
                            })
                          }
                        />
                        <input
                          className={`${inputBase} flex-1 min-w-[120px]`}
                          placeholder="Tab label"
                          value={tab.label || ""}
                          onChange={(e) =>
                            patchModuleUi(m.id, (cfg) => {
                              const tabs = [...(cfg.moduleTabs || [])];
                              tabs[ti] = { ...tabs[ti], label: e.target.value };
                              return { ...cfg, moduleTabs: tabs };
                            })
                          }
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={tab.isDefault === true}
                            onChange={(e) =>
                              patchModuleUi(m.id, (cfg) => {
                                const tabs = (cfg.moduleTabs || []).map((t, j) => ({
                                  ...t,
                                  isDefault: j === ti ? e.target.checked : false
                                }));
                                return { ...cfg, moduleTabs: tabs };
                              })
                            }
                          />
                          Default
                        </label>
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-rose-600 text-white text-xs"
                          onClick={() =>
                            patchModuleUi(m.id, (cfg) => {
                              const tabs = [...(cfg.moduleTabs || [])];
                              tabs.splice(ti, 1);
                              return { ...cfg, moduleTabs: tabs };
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs"
                      onClick={() =>
                        patchModuleUi(m.id, (cfg) => ({
                          ...cfg,
                          moduleTabs: [...(cfg.moduleTabs || []), { key: `tab_${Date.now()}`, label: "New tab" }]
                        }))
                      }
                    >
                      Add tab
                    </button>
                  </div>
                  {(parseObject(m.ui_config_json, {}).moduleTabs || [])
                    .filter((tab) => tab?.key)
                    .map((tab, ti) => {
                      const cfgFull = parseObject(m.ui_config_json, {});
                      const rawTp = cfgFull.tabPanels?.[tab.key];
                      const tpSafe = rawTp && typeof rawTp === "object" ? rawTp : {};
                      const fkOptsTab = moduleFieldsById[m.id] || [];
                      return (
                        <FoldSection
                          key={`${tab.key}-${ti}`}
                          title={`Tab override · ${tab.label || tab.key}`}
                          hint={`Storage key: ${tab.key}`}
                          defaultOpen={false}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              className={inputBase}
                              placeholder="Page title (this tab)"
                              value={tpSafe.pageTitle ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                patchTabPanel(m.id, tab.key, (cur) => {
                                  const n = { ...cur };
                                  if (!v) delete n.pageTitle;
                                  else n.pageTitle = v;
                                  return n;
                                });
                              }}
                            />
                            <input
                              className={inputBase}
                              placeholder="Page subtitle (this tab)"
                              value={tpSafe.pageSubtitle ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                patchTabPanel(m.id, tab.key, (cur) => {
                                  const n = { ...cur };
                                  if (!v) delete n.pageSubtitle;
                                  else n.pageSubtitle = v;
                                  return n;
                                });
                              }}
                            />
                            <input
                              className={inputBase}
                              placeholder="Table title (this tab)"
                              value={tpSafe.tableTitle ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                patchTabPanel(m.id, tab.key, (cur) => {
                                  const n = { ...cur };
                                  if (!v) delete n.tableTitle;
                                  else n.tableTitle = v;
                                  return n;
                                });
                              }}
                            />
                            <input
                              className={inputBase}
                              placeholder="Table subtitle (this tab)"
                              value={tpSafe.tableSubtitle ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                patchTabPanel(m.id, tab.key, (cur) => {
                                  const n = { ...cur };
                                  if (!v) delete n.tableSubtitle;
                                  else n.tableSubtitle = v;
                                  return n;
                                });
                              }}
                            />
                          </div>
                          <ModuleTableColumnsEditor
                            inputBase={inputBase}
                            fkOpts={fkOptsTab}
                            metricChoices={metricChoices}
                            columns={tpSafe.tableColumns}
                            commitColumns={(tc) =>
                              patchTabPanel(m.id, tab.key, (cur) => ({
                                ...cur,
                                tableColumns: tc
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="text-xs text-rose-600 hover:underline"
                            onClick={() =>
                              patchModuleUi(m.id, (cfg) => {
                                const tp = {
                                  ...(cfg.tabPanels && typeof cfg.tabPanels === "object" ? cfg.tabPanels : {})
                                };
                                delete tp[tab.key];
                                return {
                                  ...cfg,
                                  tabPanels: Object.keys(tp).length ? tp : undefined
                                };
                              })
                            }
                          >
                            Clear all overrides for this tab
                          </button>
                        </FoldSection>
                      );
                    })}
                </div>
                </FoldSection>

                <FoldSection
                  title="Filters (toolbar)"
                  hint="Appears below shared cards. Optional row filter on select + field."
                  defaultOpen={false}
                >
                <div className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Typed filters — <strong>daterange</strong> maps to from/to dates; for <strong>date</strong> set bound field + compare (from/to/exact) to filter rows.{" "}
                    <strong>search</strong> can list field keys (comma) to search across. For <strong>select</strong>, bind a field below to filter table rows.
                  </p>
                  {filterDefsFromCfgObject(parseObject(m.ui_config_json, {})).map((def, idx) => {
                    const fkOpts = moduleFieldsById[m.id] || [];
                    return (
                      <div key={`${def.key}-${idx}`} className="rounded border border-slate-200 dark:border-slate-600 p-2 space-y-2">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                          {def.filterType !== "daterange" && (
                            <input
                              className={`${inputBase} lg:col-span-2`}
                              placeholder="key (slug)"
                              value={def.key || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], key: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            />
                          )}
                          {def.filterType === "daterange" && (
                            <input
                              className={`${inputBase} lg:col-span-2`}
                              placeholder="range id (optional)"
                              value={def.key || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], key: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            />
                          )}
                          <input
                            className={`${inputBase} lg:col-span-3`}
                            placeholder={def.filterType === "daterange" ? "Label from (e.g. FROM DATE)" : "Label / heading"}
                            value={def.filterType === "daterange" ? def.labelFrom || "" : def.label || ""}
                            onChange={(e) =>
                              patchModuleUi(m.id, (cfg) => {
                                const fds = filterDefsFromCfgObject(cfg);
                                if (fds[idx].filterType === "daterange") {
                                  fds[idx] = { ...fds[idx], labelFrom: e.target.value };
                                } else {
                                  fds[idx] = { ...fds[idx], label: e.target.value };
                                }
                                return { ...cfg, filterDefs: fds };
                              })
                            }
                          />
                          <select
                            className={`${inputBase} lg:col-span-2`}
                            value={def.filterType || "search"}
                            onChange={(e) =>
                              patchModuleUi(m.id, (cfg) => {
                                const fds = filterDefsFromCfgObject(cfg);
                                const t = e.target.value;
                                let next = { ...fds[idx], filterType: t };
                                if (t === "daterange") {
                                  next = {
                                    ...next,
                                    key: fds[idx].key || `range_${Date.now()}`,
                                    keyFrom: "fromDate",
                                    keyTo: "toDate",
                                    labelFrom: "From date",
                                    labelTo: "To date",
                                    boundFieldKey: ""
                                  };
                                } else if (t === "select") {
                                  next.options = fds[idx].options?.length ? fds[idx].options : ["All"];
                                }
                                fds[idx] = next;
                                return { ...cfg, filterDefs: fds };
                              })
                            }
                          >
                            {FILTER_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          {def.filterType === "select" ? (
                            <input
                              className={`${inputBase} lg:col-span-3`}
                              placeholder="Options (comma separated)"
                              value={(def.options || []).join(", ")}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  const opts = e.target.value
                                    .split(",")
                                    .map((x) => x.trim())
                                    .filter(Boolean);
                                  fds[idx] = { ...fds[idx], options: opts.length ? opts : ["All"] };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            />
                          ) : def.filterType === "daterange" ? (
                            <input
                              className={`${inputBase} lg:col-span-3`}
                              placeholder="Label to (e.g. TO DATE)"
                              value={def.labelTo || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], labelTo: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            />
                          ) : (
                            <input
                              className={`${inputBase} lg:col-span-3`}
                              placeholder={def.filterType === "search" ? "Placeholder" : "—"}
                              value={def.placeholder || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], placeholder: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            />
                          )}
                          <button
                            type="button"
                            className="px-3 py-2 rounded bg-rose-600 text-white text-xs lg:col-span-2"
                            onClick={() =>
                              patchModuleUi(m.id, (cfg) => {
                                const fds = filterDefsFromCfgObject(cfg);
                                fds.splice(idx, 1);
                                return fds.length ? { ...cfg, filterDefs: fds } : { ...cfg, filterDefs: [] };
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                        {def.filterType === "select" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                            <select
                              className={inputBase}
                              value={def.boundFieldKey || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = {
                                    ...fds[idx],
                                    boundFieldKey: e.target.value || undefined
                                  };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            >
                              <option value="">No row filter (only card visibility / UI)</option>
                              {fkOpts.map((f) => (
                                <option key={f.id || f.field_key} value={f.field_key}>{f.field_key}</option>
                              ))}
                            </select>
                            <p className="text-[10px] text-slate-500">
                              If set, table rows must match the selected option value in this field (skip “All”).
                            </p>
                          </div>
                        )}
                        {def.filterType === "daterange" && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              className={inputBase}
                              placeholder="state key from (e.g. fromDate)"
                              value={def.keyFrom || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], keyFrom: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            />
                            <input
                              className={inputBase}
                              placeholder="state key to (e.g. toDate)"
                              value={def.keyTo || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], keyTo: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            />
                            <select
                              className={inputBase}
                              value={def.boundFieldKey || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], boundFieldKey: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            >
                              <option value="">Record date field…</option>
                              {fkOpts.map((f) => (
                                <option key={f.id || f.field_key} value={f.field_key}>{f.field_key}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {def.filterType === "date" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <select
                              className={inputBase}
                              value={def.boundFieldKey || ""}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], boundFieldKey: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            >
                              <option value="">Bound record field (optional)</option>
                              {fkOpts.map((f) => (
                                <option key={f.id || f.field_key} value={f.field_key}>{f.field_key}</option>
                              ))}
                            </select>
                            <select
                              className={inputBase}
                              value={def.dateCompare || "exact"}
                              onChange={(e) =>
                                patchModuleUi(m.id, (cfg) => {
                                  const fds = filterDefsFromCfgObject(cfg);
                                  fds[idx] = { ...fds[idx], dateCompare: e.target.value };
                                  return { ...cfg, filterDefs: fds };
                                })
                              }
                            >
                              <option value="exact">Exact date</option>
                              <option value="from">From (row date &gt;= filter)</option>
                              <option value="to">To (row date &lt;= filter)</option>
                            </select>
                          </div>
                        )}
                        {def.filterType === "search" && (
                          <input
                            className={inputBase}
                            placeholder="Search across field keys (comma), e.g. txn_ref,merchant_name"
                            value={(def.searchKeys || []).join(", ")}
                            onChange={(e) =>
                              patchModuleUi(m.id, (cfg) => {
                                const fds = filterDefsFromCfgObject(cfg);
                                const keys = e.target.value
                                  .split(",")
                                  .map((x) => x.trim())
                                  .filter(Boolean);
                                fds[idx] = { ...fds[idx], searchKeys: keys };
                                return { ...cfg, filterDefs: fds };
                              })
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs"
                    onClick={() =>
                      patchModuleUi(m.id, (cfg) => {
                        const fds = filterDefsFromCfgObject(cfg);
                        fds.push({
                          key: `f_${Date.now()}`,
                          label: "New filter",
                          filterType: "search",
                          placeholder: "…",
                          options: [],
                          searchKeys: []
                        });
                        return { ...cfg, filterDefs: fds };
                      })
                    }
                  >
                    Add filter
                  </button>
                </div>
                </FoldSection>

                <FoldSection
                  title="Shared top cards (all tabs)"
                  hint="These sections stay when you switch tabs. Tab-only cards: Enterprise → Tab override."
                  defaultOpen={false}
                >
                <div className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Shown above the filter toolbar on every tab.</p>
                  {(parseObject(m.ui_config_json, {}).cards || []).map((c, idx) => {
                    const fds = filterDefsFromCfgObject(parseObject(m.ui_config_json, {}));
                    const vw = c.visibleWhen;
                    const selDef = fds.find((d) => d.key === (vw?.filterKey || ""));
                    return (
                      <div key={idx} className="rounded border border-slate-200 dark:border-slate-600 p-2 space-y-2">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                          <input
                            className={`${inputBase} lg:col-span-3`}
                            placeholder="Card title"
                            value={c.title || ""}
                            onChange={(e) => {
                              const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                              cards[idx] = { ...cards[idx], title: e.target.value };
                              setModuleCards(m.id, cards);
                            }}
                          />
                          <input
                            className={`${inputBase} lg:col-span-4`}
                            placeholder="Card subtitle"
                            value={c.subtitle || ""}
                            onChange={(e) => {
                              const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                              cards[idx] = { ...cards[idx], subtitle: e.target.value };
                              setModuleCards(m.id, cards);
                            }}
                          />
                          <select
                            className={`${inputBase} lg:col-span-2`}
                            value={vw?.filterKey || ""}
                            onChange={(e) => {
                              const fk = e.target.value;
                              const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                              if (!fk) {
                                cards[idx] = { ...cards[idx], visibleWhen: undefined, filter: undefined };
                              } else {
                                cards[idx] = {
                                  ...cards[idx],
                                  filter: undefined,
                                  visibleWhen: { filterKey: fk, value: vw?.filterKey === fk ? vw.value || "" : "" }
                                };
                              }
                              setModuleCards(m.id, cards);
                            }}
                          >
                            <option value="">Always show</option>
                            {fds.map((fd) => (
                              <option key={fd.key} value={fd.key}>{fd.label} ({fd.key})</option>
                            ))}
                          </select>
                          {selDef?.filterType === "select" && vw?.filterKey ? (
                            <select
                              className={`${inputBase} lg:col-span-2`}
                              value={vw?.value || ""}
                              onChange={(e) => {
                                const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                                cards[idx] = {
                                  ...cards[idx],
                                  visibleWhen: { filterKey: vw.filterKey, value: e.target.value }
                                };
                                setModuleCards(m.id, cards);
                              }}
                            >
                              {(selDef.options || []).map((op) => (
                                <option key={op} value={op}>{op}</option>
                              ))}
                            </select>
                          ) : vw?.filterKey ? (
                            <input
                              className={`${inputBase} lg:col-span-2`}
                              placeholder="Match value"
                              value={vw?.value || ""}
                              onChange={(e) => {
                                const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                                cards[idx] = {
                                  ...cards[idx],
                                  visibleWhen: { filterKey: vw.filterKey, value: e.target.value }
                                };
                                setModuleCards(m.id, cards);
                              }}
                            />
                          ) : (
                            <span className="lg:col-span-2 text-[10px] text-slate-500 self-center px-2">No filter visibility</span>
                          )}
                          <button
                            type="button"
                            className="px-3 py-2 rounded bg-rose-600 text-white text-xs lg:col-span-1"
                            onClick={() => {
                              const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                              cards.splice(idx, 1);
                              setModuleCards(m.id, cards);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="rounded border border-dashed border-slate-300 dark:border-slate-600 p-2 space-y-1">
                          <p className="text-[10px] text-slate-500">Metric rows inside this card (bound to metric_key)</p>
                          {(Array.isArray(c.metricRows) ? c.metricRows : []).map((mr, ri) => (
                            <div key={ri} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                              <input
                                className={`${inputBase} md:col-span-4`}
                                placeholder="Label"
                                value={mr.label || ""}
                                onChange={(e) => {
                                  const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                                  const mrs = [...(cards[idx].metricRows || [])];
                                  mrs[ri] = { ...mrs[ri], label: e.target.value };
                                  cards[idx] = { ...cards[idx], metricRows: mrs };
                                  setModuleCards(m.id, cards);
                                }}
                              />
                              <select
                                className={`${inputBase} md:col-span-5`}
                                value={mr.metricKey || ""}
                                onChange={(e) => {
                                  const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                                  const mrs = [...(cards[idx].metricRows || [])];
                                  mrs[ri] = {
                                    ...mrs[ri],
                                    metricKey: e.target.value || undefined
                                  };
                                  cards[idx] = { ...cards[idx], metricRows: mrs };
                                  setModuleCards(m.id, cards);
                                }}
                              >
                                <option value="">Pick metric_key</option>
                                {metricChoices.map((mk) => (
                                  <option key={mk} value={mk}>{mk}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="md:col-span-3 px-3 py-1.5 rounded bg-rose-500 text-white text-xs"
                                onClick={() => {
                                  const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                                  const mrs = [...(cards[idx].metricRows || [])];
                                  mrs.splice(ri, 1);
                                  cards[idx] = { ...cards[idx], metricRows: mrs };
                                  setModuleCards(m.id, cards);
                                }}
                              >
                                Drop row
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="mt-2 px-2 py-1 rounded bg-slate-700 text-white text-[11px]"
                            onClick={() => {
                              const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                              const mrs = [...(cards[idx].metricRows || [])];
                              mrs.push({ label: "KPI", metricKey: metricChoices[0] || undefined });
                              cards[idx] = { ...cards[idx], metricRows: mrs };
                              setModuleCards(m.id, cards);
                            }}
                          >
                            Add metric row
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs"
                    onClick={() => {
                      const cards = [...(parseObject(m.ui_config_json, {}).cards || [])];
                      cards.push({ title: "New Section", subtitle: "" });
                      setModuleCards(m.id, cards);
                    }}
                  >
                    Add top card
                  </button>
                </div>
                </FoldSection>

                <FoldSection
                  title="Default table columns"
                  hint="Used when a tab has no column override. Tabs with overrides use Enterprise → Tab override."
                  defaultOpen={false}
                >
                  <ModuleTableColumnsEditor
                    inputBase={inputBase}
                    fkOpts={moduleFieldsById[m.id] || []}
                    metricChoices={metricChoices}
                    columns={parseObject(m.ui_config_json, {}).tableColumns}
                    commitColumns={(tc) =>
                      patchModuleUi(m.id, (cfg) => ({ ...cfg, tableColumns: tc }))
                    }
                  />
                </FoldSection>

                <button
                  className="mt-2 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs"
                  type="button"
                  onClick={async () => {
                    const raw = finalizeModuleUi(parseObject(m.ui_config_json, {}));
                    await updateModuleUi(m.id, raw);
                    setMetaMsg("Module UI config updated");
                    await loadUiMeta();
                    onUpdated?.();
                  }}
                >
                  Save Module UI
                </button>
              </div>
            ))}
          </div>
          </FoldSection>
        </div>

        {metaMsg && <p className="text-sm text-slate-600 dark:text-slate-300">{metaMsg}</p>}
      </div>
    </div>
  );
}

