const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  for (const [key, value] of Object.entries(params || {})) {
    if (value != null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});

  if (options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, options.params), {
    ...options,
    headers,
    credentials: "include",
    body: options.body && !isFormData ? JSON.stringify(options.body) : options.body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with ${response.status}`);
  }

  return data;
}

export const api = {
  dashboard: () => apiRequest("/dashboard"),
  me: () => apiRequest("/auth/me"),
  login: (body) => apiRequest("/auth/login", { method: "POST", body }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  items: (params) => apiRequest("/items", { params }),
  item: (id) => apiRequest(`/items/${encodeURIComponent(id)}`),
  createItem: (body) => apiRequest("/items", { method: "POST", body }),
  updateItem: (id, body) => apiRequest(`/items/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  locations: () => apiRequest("/locations"),
  locationInventory: (code) => apiRequest(`/locations/${encodeURIComponent(code)}/inventory`),
  photos: (params) => apiRequest("/photos", { params }),
  uploadPhoto: (body) => apiRequest("/photos", { method: "POST", body }),
  setPrimaryPhoto: (itemId, photoId, body) =>
    apiRequest(`/items/${encodeURIComponent(itemId)}/photos/${encodeURIComponent(photoId)}/primary`, { method: "POST", body }),
  unlinkItemPhoto: (itemId, photoId, locationCode) =>
    apiRequest(`/items/${encodeURIComponent(itemId)}/photos/${encodeURIComponent(photoId)}`, { method: "DELETE", params: { locationCode } }),
  auditSessions: (params) => apiRequest("/audit-sessions", { params }),
  createAuditSession: (body) => apiRequest("/audit-sessions", { method: "POST", body }),
  auditSession: (id) => apiRequest(`/audit-sessions/${encodeURIComponent(id)}`),
  createAuditEntry: (sessionId, body) =>
    apiRequest(`/audit-sessions/${encodeURIComponent(sessionId)}/entries`, { method: "POST", body }),
  updateAuditEntry: (entryId, body) => apiRequest(`/audit-entries/${encodeURIComponent(entryId)}`, { method: "PATCH", body }),
  submitAuditSession: (id) => apiRequest(`/audit-sessions/${encodeURIComponent(id)}/submit`, { method: "POST" }),
  approveAuditSession: (id) => apiRequest(`/audit-sessions/${encodeURIComponent(id)}/approve`, { method: "POST" }),
};

