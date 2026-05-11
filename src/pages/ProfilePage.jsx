import { Link } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import api from "../api/client";
import { useState } from "react";

export default function ProfilePage({ user, panelConfig, onBrandingUpdated }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const isAdmin = user?.role === "admin";
  const logoProfile =
    panelConfig?.config?.logo_profile === "rectangle" ? "rectangle" : "square";

  const setLogoProfile = async (next) => {
    if (!isAdmin || next === logoProfile) return;
    setBusy(true);
    setMsg("");
    try {
      await api.patch("/config/panel", { config: { logo_profile: next } });
      setMsg("Sidebar branding updated.");
      onBrandingUpdated?.();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Could not update branding.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <PageShell title="Profile" subtitle="Account information and preferences">
        <div className="card-elev rounded-xl p-5 max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded text-[26px] text-[var(--text-secondary)]" aria-hidden>
                account_circle
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>Name:</strong> {user?.name}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>Email:</strong> {user?.email}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>Role:</strong> {user?.role}
              </p>
            </div>
          </div>
        </div>

        <div className="card-elev rounded-xl p-5 max-w-2xl mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sidebar logo profile</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            <strong>Square</strong> shows a compact logo tile with the organization name beside it.{" "}
            <strong>Wide</strong> uses a horizontal logo across the top of the sidebar and hides the app name so the
            image carries the branding (same behavior as Mewtech-style navbar strip).
          </p>
          {!isAdmin && (
            <p className="text-xs text-[var(--text-muted)]">
              Current mode: <strong>{logoProfile === "rectangle" ? "Wide" : "Square"}</strong>. Only administrators can
              change this.
            </p>
          )}
          {isAdmin && (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  disabled={busy || logoProfile === "square"}
                  onClick={() => setLogoProfile("square")}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                >
                  Square + app name
                </button>
                <button
                  type="button"
                  disabled={busy || logoProfile === "rectangle"}
                  onClick={() => setLogoProfile("rectangle")}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                >
                  Wide logo only
                </button>
                <Link to="/settings" className="text-sm text-[var(--root-color)] hover:underline ml-1">
                  Full branding in Settings →
                </Link>
              </div>
              {msg && <p className="text-xs text-[var(--text-secondary)]">{msg}</p>}
            </>
          )}
        </div>
      </PageShell>
    </div>
  );
}
