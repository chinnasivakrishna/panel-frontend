import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveAssetUrl } from "../utils/urls";
import { useTheme } from "../context/ThemeContext";
import { materialNavGlyph } from "../utils/materialNavIcon";

function NavItem({ item, collapsed, active, onClick }) {
  const glyph = materialNavGlyph(item.icon, item.route);
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : "false"}
      className={`nav-mtw w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 min-h-[44px]
        ${active ? "nav-active-light" : "text-[color:var(--sidebar-item-text)] hover:text-white hover:bg-[var(--sidebar-hover)] hover:translate-x-0.5"}`}
    >
      <span
        className={`material-symbols-rounded nav-symbol shrink-0 ${active ? "text-[var(--sidebar-active-text)]" : ""}`}
        aria-hidden
      >
        {glyph}
      </span>
      {!collapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
    </button>
  );
}

export default function Layout({
  appName,
  logoUrl,
  logoUrlWide,
  logoUrlSquare,
  logoProfile = "square",
  navItems,
  children,
  supportEnabled,
  onOpenSupport,
  onLogout
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [notifCount] = useState(3);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const topItems = useMemo(() => navItems.filter((x) => x.position === "top"), [navItems]);
  const bottomItems = useMemo(() => navItems.filter((x) => x.position === "bottom"), [navItems]);

  const resolvedLogo = logoUrl ? resolveAssetUrl(logoUrl) : "";
  const resolvedWideLogo = logoUrlWide ? resolveAssetUrl(logoUrlWide) : resolvedLogo;
  const resolvedSquareLogo = logoUrlSquare ? resolveAssetUrl(logoUrlSquare) : resolvedLogo;
  const wideNavbarLogo = logoProfile === "rectangle" && Boolean(resolvedWideLogo);

  return (
    <div className="flex h-screen overflow-hidden app-canvas">
      <aside
        className={`
          ${collapsed ? "w-[72px]" : "w-[240px]"}
          transition-all duration-300 ease-in-out
          flex flex-col shrink-0
          sidebar-bg
          relative z-20
        `}
      >
        <div
          className={`h-16 flex items-center shrink-0 ${collapsed ? "justify-center px-2" : wideNavbarLogo ? "px-3" : "px-4 gap-3"}`}
        >
          {wideNavbarLogo ? (
            collapsed ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                <img src={resolvedSquareLogo} alt="" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="flex items-center justify-start overflow-hidden rounded-md min-w-0 flex-1 h-10 px-0">
                <img src={resolvedWideLogo} alt="" className="max-h-[40px] w-auto max-w-full object-contain object-left" />
              </div>
            )
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                {logoUrl ? (
                  <img src={resolvedLogo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#1e293b] font-bold text-sm">
                    {appName?.slice(0, 2).toUpperCase() || "EP"}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate leading-tight">{appName}</p>
                </div>
              )}
            </>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
          {topItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              active={location.pathname === item.route}
              onClick={() => navigate(item.route)}
            />
          ))}
        </nav>

        <div className="p-3 space-y-1 shrink-0 pt-2">
          {bottomItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              active={location.pathname === item.route}
              onClick={() => navigate(item.route)}
            />
          ))}

          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-white/75 hover:text-white hover:bg-white/10 transition-colors min-h-[44px]"
          >
            <span className="material-symbols-rounded nav-symbol shrink-0 text-white/75" aria-hidden>logout</span>
            {!collapsed && <span className="text-sm font-medium">Sign out</span>}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-white/90 hover:bg-white/10 transition-colors mt-1 min-h-[44px]"
          >
            <span className="material-symbols-rounded nav-symbol shrink-0 text-white/90" aria-hidden>
              {collapsed ? "chevron_right" : "chevron_left"}
            </span>
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 flex items-center justify-end border-b border-[var(--border)] bg-[var(--surface-1)]/70 backdrop-blur shrink-0 gap-2">
          <button
            type="button"
            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            title="Notifications"
            aria-label={`Notifications${notifCount ? `, ${notifCount} unread` : ""}`}
          >
            <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center text-current">
              <span className="material-symbols-rounded" aria-hidden>notifications</span>
              {notifCount > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-2 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-[5px] text-[10px] font-bold leading-none text-white shadow-sm ring-[2px] ring-[var(--surface-1)]"
                >
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            title="Settings"
          >
            <span className="material-symbols-rounded" aria-hidden>settings</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            title="Toggle theme"
          >
            <span className="material-symbols-rounded" aria-hidden>
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>

      {supportEnabled && (
        <button
          type="button"
          onClick={onOpenSupport}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-30 bg-[var(--root-color)] text-white hover:opacity-90 transition-opacity"
          title="Customer Support"
          aria-label="Customer support"
        >
          <span className="material-symbols-rounded" aria-hidden>support_agent</span>
        </button>
      )}
    </div>
  );
}
