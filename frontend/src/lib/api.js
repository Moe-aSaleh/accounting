const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export function clearStoredTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

export function buildApiUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

function getAccessToken(token) {
  return localStorage.getItem("access") || token;
}

export async function refreshAccessToken({ onUnauthorized, failSilently = false } = {}) {
  const refreshToken = localStorage.getItem("refresh");

  if (!refreshToken) {
    if (!failSilently) onUnauthorized?.();
    return null;
  }

  const response = await fetch(buildApiUrl("/api/token/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }

  if (!response.ok || !payload?.access) {
    clearStoredTokens();
    if (!failSilently) onUnauthorized?.();
    return null;
  }

  localStorage.setItem("access", payload.access);
  if (payload.refresh) localStorage.setItem("refresh", payload.refresh);
  return payload.access;
}

export async function logoutUser() {
  clearStoredTokens();
}

async function requestProtected(path, { token, onUnauthorized, fallbackMessage, method = "GET", body, rawBody, query }) {
  const sendRequest = async (accessToken) =>
    fetch(buildApiUrl(path, query), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...(rawBody ? { body: rawBody } : {}),
    });

  let response = await sendRequest(getAccessToken(token));
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }

  if (response.status === 401) {
    const nextAccessToken = await refreshAccessToken({ onUnauthorized });
    if (!nextAccessToken) return null;
    response = await sendRequest(nextAccessToken);
    try { payload = await response.json(); } catch { payload = null; }
  }

  if (response.status === 401) {
    onUnauthorized?.();
    return null;
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, fallbackMessage));
  }

  return method === "DELETE" ? true : payload;
}

function flattenErrorValue(value) {
  if (Array.isArray(value)) return value.join(" ");
  if (value && typeof value === "object") return Object.values(value).map(flattenErrorValue).filter(Boolean).join(" ");
  return typeof value === "string" ? value : "";
}

export function getApiErrorMessage(payload, fallbackMessage) {
  if (!payload) return fallbackMessage;
  if (typeof payload === "string") return payload;
  if (typeof payload.detail === "string") return payload.detail;
  const values = Object.values(payload).map(flattenErrorValue).filter(Boolean);
  return values[0] || fallbackMessage;
}

export async function fetchProtectedJson(path, { token, onUnauthorized, fallbackMessage, query }) {
  return requestProtected(path, { token, onUnauthorized, fallbackMessage, query });
}

export async function postProtectedJson(path, { token, onUnauthorized, fallbackMessage, body, query }) {
  return requestProtected(path, { token, onUnauthorized, fallbackMessage, method: "POST", body, query });
}

export async function putProtectedJson(path, { token, onUnauthorized, fallbackMessage, body, query }) {
  return requestProtected(path, { token, onUnauthorized, fallbackMessage, method: "PUT", body, query });
}

export async function deleteProtected(path, { token, onUnauthorized, fallbackMessage, query }) {
  return requestProtected(path, { token, onUnauthorized, fallbackMessage, method: "DELETE", query });
}

export async function uploadProtectedFile(path, { token, onUnauthorized, fallbackMessage, file, query }) {
  const formData = new FormData();
  formData.append("file", file);
  return requestProtected(path, { token, onUnauthorized, fallbackMessage, method: "POST", rawBody: formData, query });
}

export async function postProtectedAction(path, { token, onUnauthorized, fallbackMessage, query }) {
  return requestProtected(path, { token, onUnauthorized, fallbackMessage, method: "POST", query });
}
