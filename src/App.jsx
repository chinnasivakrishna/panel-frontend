import { useEffect, useState } from "react";
import api from "./api/client";
import Layout from "./components/Layout";
import SupportPanel from "./components/SupportPanel";
import { useAuth } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import ProductsPage from "./pages/ProductsPage";
import ToolsPage from "./pages/ToolsPage";
import SettingsPage from "./pages/SettingsPage";
import DynamicModulePage from "./pages/DynamicModulePage";
import { Navigate, Route, Routes } from "react-router-dom";

function dedupeByRoute(items = []) {
  const map = new Map();
  for (const item of items) {
    const key = `${item.position || "top"}::${item.route}`;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

export default function App() {
  const { user, logout } = useAuth();
  const [panelConfig, setPanelConfig] = useState({
    config: {},
    nav: [],
    widgets: [],
    homeCards: [],
    modules: [],
    metrics: {}
  });
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPanel();
  }, [user]);

  const loadPanel = async () => {
    const { data } = await api.get("/config/panel");
    setPanelConfig({
      ...data,
      nav: dedupeByRoute(data.nav || [])
    });
    document.documentElement.style.setProperty("--root-color", data.config.color_root || "#2563eb");
    document.documentElement.style.setProperty("--secondary-color", data.config.color_secondary || "#10b981");
    document.documentElement.style.setProperty("--tertiary-color", data.config.color_tertiary || "#f59e0b");
  };

  if (!user) return <LoginPage />;

  const defaultRoute = panelConfig.nav.find((n) => n.route === "/dashboard")?.route
    || panelConfig.nav[0]?.route
    || "/dashboard";
  const staticRoutes = new Set(["/dashboard", "/products", "/tools", "/settings", "/profile"]);
  const moduleRoutes = (panelConfig.modules || []).filter((m) => m.route && !staticRoutes.has(m.route));

  return (
    <>
      <Layout
        appName={panelConfig.config.app_name || "Enterprise Panel"}
        logoUrl={panelConfig.config.logo_url}
        logoUrlWide={panelConfig.config.logo_url_wide}
        logoUrlSquare={panelConfig.config.logo_url_square}
        logoProfile={panelConfig.config.logo_profile === "rectangle" ? "rectangle" : "square"}
        navItems={panelConfig.nav}
        supportEnabled={panelConfig.config.support_widget_enabled !== "false"}
        onOpenSupport={() => setSupportOpen(true)}
        onLogout={logout}
      >
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                widgets={panelConfig.homeCards?.length ? panelConfig.homeCards : panelConfig.widgets}
                metrics={panelConfig.metrics || {}}
              />
            }
          />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/settings" element={<SettingsPage panelConfig={panelConfig} onUpdated={loadPanel} />} />
          <Route
            path="/profile"
            element={
              <ProfilePage user={user} panelConfig={panelConfig} onBrandingUpdated={loadPanel} />
            }
          />
          {moduleRoutes.map((m) => (
            <Route
              key={m.id}
              path={m.route}
              element={
                <DynamicModulePage modules={panelConfig.modules} metrics={panelConfig.metrics || {}} />
              }
            />
          ))}
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </Layout>
      <SupportPanel open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
