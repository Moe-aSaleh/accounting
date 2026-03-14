const _apiBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (_apiBase == null ? "http://127.0.0.1:8000" : _apiBase).replace(/\/$/, "");

export function buildApiUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

export async function refreshAccessToken({ onUnauthorized, failSilently = false } = {}) {
  try {
    const response = await fetch(buildApiUrl("/api/token/refresh/"), {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      if (!failSilently) {
        onUnauthorized?.();
      }
      return false;
    }

    return true;
  } catch {
    if (!failSilently) {
      onUnauthorized?.();
    }
    return false;
  }
}

export async function logoutUser() {
  try {
    await fetch(buildApiUrl("/api/logout/"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network errors during logout — cookies will expire naturally.
  }
}

async function requestProtected(
  path,
  {
    onUnauthorized,
    fallbackMessage,
    method = "GET",
    body,
    rawBody,
    query,
  },
) {
  const sendRequest = async () =>
    fetch(buildApiUrl(path, query), {
      method,
      credentials: "include",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...(rawBody ? { body: rawBody } : {}),
    });

  let response = await sendRequest();
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.status === 401) {
    const refreshed = await refreshAccessToken({ onUnauthorized });

    if (!refreshed) {
      return null;
    }

    response = await sendRequest();

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
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
  if (Array.isArray(value)) {
    return value.join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(flattenErrorValue).filter(Boolean).join(" ");
  }

  return typeof value === "string" ? value : "";
}

export function getApiErrorMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  const values = Object.values(payload).map(flattenErrorValue).filter(Boolean);
  return values[0] || fallbackMessage;
}

export async function fetchProtectedJson(
  path,
  { onUnauthorized, fallbackMessage, query },
) {
  return requestProtected(path, {
    onUnauthorized,
    fallbackMessage,
    query,
  });
}

export async function postProtectedJson(
  path,
  { onUnauthorized, fallbackMessage, body, query },
) {
  return requestProtected(path, {
    onUnauthorized,
    fallbackMessage,
    method: "POST",
    body,
    query,
  });
}

export async function putProtectedJson(
  path,
  { onUnauthorized, fallbackMessage, body, query },
) {
  return requestProtected(path, {
    onUnauthorized,
    fallbackMessage,
    method: "PUT",
    body,
    query,
  });
}

export async function deleteProtected(
  path,
  { onUnauthorized, fallbackMessage, query },
) {
  return requestProtected(path, {
    onUnauthorized,
    fallbackMessage,
    method: "DELETE",
    query,
  });
}

export async function uploadProtectedFile(
  path,
  { onUnauthorized, fallbackMessage, file, query },
) {
  const formData = new FormData();
  formData.append("file", file);

  return requestProtected(path, {
    onUnauthorized,
    fallbackMessage,
    method: "POST",
    rawBody: formData,
    query,
  });
}

export async function postProtectedAction(
  path,
  { onUnauthorized, fallbackMessage, query },
) {
  return requestProtected(path, {
    onUnauthorized,
    fallbackMessage,
    method: "POST",
    query,
  });
}
