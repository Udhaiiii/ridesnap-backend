/**
 * In dev, always use the Vite proxy (`/api` → localhost:5000) so login avoids CORS.
 * A direct `VITE_API_URL=http://localhost:5000/api` triggers cross-origin requests from :5173.
 */
function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (import.meta.env.DEV) {
    if (
      !configured ||
      /localhost:5000|127\.0\.0\.1:5000/.test(configured)
    ) {
      return '/api';
    }
    return configured;
  }

  return configured ?? `${window.location.origin}/api`;
}

const API_BASE = resolveApiBase();

export function getToken(): string | null {
  return localStorage.getItem('rs_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['x-auth-token'] = token;
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  } else {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return data;
}

export { API_BASE };
