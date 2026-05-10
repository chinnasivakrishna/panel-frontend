import { ChevronDown } from "lucide-react";

export default function KpiCard({ title, subtitle, accent = "root", period = "Daily", rows = [] }) {
  const stripe =
    accent === "secondary"
      ? "var(--secondary-color)"
      : accent === "tertiary"
        ? "var(--tertiary-color)"
        : "var(--root-color)";

  return (
    <section
      className="card-elev card-top-accent card-kpi-interactive rounded-xl p-4 overflow-hidden h-full flex flex-col"
      style={{ ["--kpi-stripe"]: stripe }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-800 flex items-center gap-1 shrink-0"
        >
          {period} <ChevronDown size={14} className="opacity-60" />
        </button>
      </div>

      <div className="mt-4 space-y-3 flex-1">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-3 rounded-lg -mx-1 px-1 py-1.5 transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="text-xs text-[var(--text-secondary)]">{r.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{r.value}</span>
              {typeof r.delta !== "undefined" && (
                <span className={`text-[10px] font-medium ${r.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {r.delta >= 0 ? `+${r.delta}` : r.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
