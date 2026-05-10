export function apiOrigin() {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
  return apiBase.replace(/\/api\/?$/, "");
}

export function resolveAssetUrl(url) {
  if (!url) return "";
  // Absolute URLs already fine
  if (/^https?:\/\//i.test(url)) return url;
  // Backend-served assets (uploads) need API origin prefix
  if (url.startsWith("/uploads/")) return `${apiOrigin()}${url}`;
  // Public assets from Vite (client/public) can remain relative
  return url;
}

