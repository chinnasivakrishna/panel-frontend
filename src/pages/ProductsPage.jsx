import PageShell from "../components/ui/PageShell";

export default function ProductsPage() {
  return (
    <div className="max-w-6xl">
      <PageShell title="Products" subtitle="Manage products, pricing and visibility across the org">
        <div className="card-elev rounded-xl p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            This page is now using the same layout + card styling as the reference. Next we’ll plug real product modules and make the widgets/cards configurable from DB.
          </p>
        </div>
      </PageShell>
    </div>
  );
}