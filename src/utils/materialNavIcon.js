/** Map Lucide / DB icon names + routes → Google Material Icons ligatures (Mewtech sidebar style). */

const LUCIDE_TO_MATERIAL = {
  Home: "home",
  LayoutDashboard: "dashboard",
  LayoutGrid: "dashboard",
  Package: "inventory_2",
  Wrench: "build",
  User: "person",
  FolderKanban: "view_kanban",
  LifeBuoy: "support_agent",
  FileText: "description",
  Folder: "folder",
  Users: "people",
  List: "list",
  Receipt: "receipt_long",
  Trash2: "delete_outline",
  CreditCard: "credit_card",
  CircleUserRound: "account_circle",
  Settings: "settings",
  CircleDot: "fiber_manual_record",
  BarChart3: "bar_chart",
  Bell: "notifications",
  LogOut: "logout",
  ChevronLeft: "chevron_left",
  ChevronRight: "chevron_right"
};

export function materialNavGlyph(iconName, route) {
  const key = typeof iconName === "string" ? iconName.trim() : "";
  if (key && LUCIDE_TO_MATERIAL[key]) return LUCIDE_TO_MATERIAL[key];

  const r = String(route || "").toLowerCase();
  if (r.includes("/dashboard") || r === "/") return "dashboard";
  if (r.includes("invoice")) return "receipt_long";
  if (r.includes("account")) return "people";
  if (r.includes("record")) return "folder";
  if (r.includes("transact")) return "payment";
  if (r.includes("trash")) return "delete_outline";
  if (r.includes("profile")) return "account_circle";
  if (r.includes("setting")) return "settings";
  if (r.includes("product")) return "inventory_2";
  if (r.includes("tool")) return "build";

  return "radio_button_unchecked";
}
