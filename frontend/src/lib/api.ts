export function getApiUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || "";
  url = url.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.");
    
    if (!isLocalhost && (!url || url.includes("localhost") || url.includes("127.0.0.1"))) {
      if (window.location.protocol === "https:") {
        return `${window.location.origin}/api/v1`;
      }
      return `http://${hostname}:8001/api/v1`;
    }
  }

  return url || "http://localhost:8001/api/v1";
}

export interface ApiFetchOptions {
  endpoint: string;
  method: string;
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T = unknown>(endpoint: string, method: string, body?: unknown, token?: string | null): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    let errorData: Record<string, unknown> = {};
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { detail: text || `Request failed with status ${response.status}` };
    }

    // -- 401 Unauthorized: clear session and redirect to login ----------------
    // If the backend returns 401, the session token is expired, invalid, or stale.
    if (response.status === 401 && token) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        // Clear the persisted auth state and force re-login
        try {
          const raw = localStorage.getItem("voqly-auth");
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.state = { ...parsed.state, token: null, isLoggedIn: false, user: null };
            localStorage.setItem("voqly-auth", JSON.stringify(parsed));
          }
        } catch { /* ignore */ }
        window.location.href = "/login?reason=session_expired";
        // Throw a sentinel so callers don't show an error before redirect
        throw Object.assign(new Error("SESSION_EXPIRED"), { status: 401, redirecting: true });
      }
    }

    const message =
      typeof errorData === "object" && errorData !== null && "detail" in errorData
        ? String(errorData.detail ?? `Request failed with status ${response.status}`)
        : `Request failed with status ${response.status}`;
    const error = Object.assign(new Error(message), {
      status: response.status,
      data: errorData,
    });
    throw error;
  }
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("Failed to parse JSON response:", text);
    throw new Error("Invalid response format received from server");
  }
}

/**
 * Upload a file via multipart/form-data to the given endpoint.
 * The field name is "file" to match the FastAPI `UploadFile = File(...)` params.
 * NOTE: we intentionally do NOT set a Content-Type header — the browser must set
 * it to `multipart/form-data` with the correct boundary automatically.
 */
export async function apiUpload<T = unknown>(endpoint: string, file: File, token?: string | null): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  const text = await response.text();
  if (!response.ok) {
    let detail = `Upload failed with status ${response.status}`;
    try {
      const errData = JSON.parse(text);
      if (errData?.detail) detail = String(errData.detail);
    } catch {
      /* response body was not JSON — keep the status-based message */
    }
    throw Object.assign(new Error(detail), { status: response.status });
  }

  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("Failed to parse JSON response:", text);
    throw new Error("Invalid response format received from server");
  }
}
