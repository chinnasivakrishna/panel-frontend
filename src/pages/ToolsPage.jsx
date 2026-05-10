import PageShell from "../components/ui/PageShell";

export default function ToolsPage() {
  return (
    <div className="max-w-6xl">
      <PageShell title="Tools" subtitle="Enterprise utilities, automations and admin tooling">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Automation", "Reports", "Integrations"].map((t) => (
            <div key={t} className="card-elev rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Module placeholder (DB-configurable next).</p>
            </div>
          ))}
        </div>
      </PageShell>
    </div>
  );
}

