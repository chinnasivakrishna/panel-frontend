import PageShell from "../components/ui/PageShell";
import KpiCard from "../components/ui/KpiCard";

function parseWidgetConfig(widget) {
  const c = widget?.config_json;
  if (!c) return { rows: [] };
  if (typeof c === "object") return c;
  try {
    return JSON.parse(c);
  } catch {
    return { rows: [] };
  }
}

function mergedRows(rows, metrics) {
  return (rows || []).map((r) => {
    if (
      r?.metricKey &&
      metrics &&
      Object.prototype.hasOwnProperty.call(metrics, r.metricKey)
    ) {
      const v = metrics[r.metricKey];
      return {
        ...r,
        value: v != null && v !== "" ? String(v) : r.value ?? "—"
      };
    }
    return r;
  });
}

function cardForWidget(widget, metrics = {}) {
  const cfg = parseWidgetConfig(widget);
  const rowsFromConfig = Array.isArray(cfg.rows) ? cfg.rows : null;
  const merged = mergedRows(rowsFromConfig || [{ label: "Metric", value: widget.code || "—" }], metrics);
  return (
    <KpiCard
      title={widget.title || widget.code}
      subtitle={widget.subtitle || "Configured from database"}
      accent={widget.accent || "root"}
      rows={merged}
    />
  );
}

export default function DashboardPage({ widgets = [], metrics = {} }) {
  const enabled = widgets.filter((w) => w.enabled !== false && w.enabled !== 0);
  return (
    <div className="w-full min-w-0">
      <PageShell
        title="Hello Mr. Guest,"
        subtitle="welcome back"
        actions={
          <>
            <button className="px-4 py-2 rounded-lg bg-[var(--root-color)] text-white text-sm font-medium shadow-[var(--shadow-sm)] hover:opacity-95 transition-opacity">
              Create Invoice
            </button>
            <button className="px-4 py-2 rounded-lg bg-[var(--secondary-color)] text-white text-sm font-medium shadow-[var(--shadow-sm)] hover:opacity-95 transition-opacity">
              Create Account
            </button>
          </>
        }
      >
        <div className="grid w-full gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))]">
          {(enabled.length ? enabled : []).slice(0, 6).map((w) => (
            <div key={w.code || w.id} className="min-w-0 h-full [&>section]:h-full">
              {cardForWidget(w, metrics)}
            </div>
          ))}
          {enabled.length === 0 && (
            <div className="card-elev rounded-xl p-4 text-sm text-[var(--text-secondary)]">
              No home cards are configured. Add cards from Settings.
            </div>
          )}
        </div>
      </PageShell>
    </div>
  );
}
