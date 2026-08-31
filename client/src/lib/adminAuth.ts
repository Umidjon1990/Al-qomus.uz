const ADMIN_TOKEN_KEY = "al-qomus-admin-token";

function tokenIsCurrent(token: string): boolean {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return false;
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number; role?: string };
    return payload.role === "admin" && typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getAdminToken(): string | null {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token || !tokenIsCurrent(token)) {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    return null;
  }
  return token;
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

