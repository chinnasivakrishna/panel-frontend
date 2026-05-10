import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Moon,
  Receipt,
  Settings,
  Sun,
  Trash2,
  LifeBuoy,
  Home,
  Package,
  Wrench,
  User,
  FolderKanban,
  CircleDot,
  FileText,
  Folder,
  Users,
  List,
  CreditCard,
  CircleUserRound
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveAssetUrl } from "../utils/urls";
import { useTheme } from "../context/ThemeContext";

/** Prefer DB `icon` name; fall back to route-aware icons (Mewtech-style sidebar). */
function iconComponentFor(iconName, route) {
  const map = {
    Home,
    LayoutDashboard: LayoutGrid,
    LayoutGrid,
    Package,
    Wrench,
    User,
    FolderKanban,
    LifeBuoy,
    FileText,
    Folder,
    Users,
    List,
    Receipt,
    Trash2,
    CreditCard,
    CircleUserRound,
    Settings
  };
  const key = iconName?.trim();
  if (key && map[key]) return map[key];

  const r = String(route || "").toLowerCase();
  if (r.includes("/dashboard") || r === "/") return LayoutGrid;
  if (r.includes("invoice")) return Receipt;
  if (r.includes("account")) return Users;
  if (r.includes("record")) return Folder;
  if (r.includes("transact")) return CreditCard;
  if (r.includes("trash")) return Trash2;
  if (r.includes("profile")) return CircleUserRound;
  if (r.includes("setting")) return Settings;

  return CircleDot;
}

function NavItem({ item, collapsed, active, onClick }) {
  const Icon = iconComponentFor(item.icon, item.route);
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
      <span className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        <Icon size={22} strokeWidth={1.75} className={active ? "text-[var(--sidebar-active-text)]" : undefined} />
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
          className={`h-16 flex items-center border-b border-white/10 shrink-0 ${collapsed ? "justify-center px-2" : "px-4 gap-3"}`}
        >
          <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
            {logoUrl ? (
              <img src={resolveAssetUrl(logoUrl)} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#1a2233] font-bold text-sm">{appName?.slice(0, 2).toUpperCase() || "EP"}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{appName}</p>
            </div>
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

        <div className="mx-3 h-px bg-white/10 shrink-0" />

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
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-white/90 hover:bg-white/10 transition-colors mt-1"
          >
            <span className="flex items-center justify-center w-5 shrink-0">
              {collapsed ? <ChevronRight size={18} strokeWidth={2} /> : <ChevronLeft size={18} strokeWidth={2} />}
            </span>
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-white/75 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center justify-center w-5 shrink-0">
              <LogOut size={18} strokeWidth={2} />
            </span>
            {!collapsed && <span className="text-sm font-medium">Sign out</span>}
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
            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center text-current">
              <Bell size={20} strokeWidth={2} aria-hidden />
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
            <Settings size={20} />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
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
        >
          <LifeBuoy size={18} />
        </button>
      )}
    </div>
  );
}
