// Single fetch helper. Access token lives in memory only; the refresh token is an
// httpOnly cookie the browser sends to /api/auth/* on its own.

export type User = { id: string; name: string; email: string; role: "user" | "admin" };
type Session = { accessToken: string; user: User };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let accessToken: string | null = null;
let currentUser: User | null = null;
let refreshing: Promise<boolean> | null = null;

function setSession(s: Session | null) {
  accessToken = s?.accessToken ?? null;
  currentUser = s?.user ?? null;
}

async function parse<T>(res: Response): Promise<T> {
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? "Something went wrong");
  return body as T;
}

// Shared promise: many parallel 401s trigger one refresh call.
function refresh(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST" })
    .then(async (res) => {
      setSession(res.ok ? await res.json() : null);
      return res.ok;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** `api('/api/posters/me')`, `api('/api/posters', { method: 'POST', body: JSON.stringify(x) })` */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = () => {
    const headers = new Headers(init.headers);
    if (typeof init.body === "string") headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(path, { ...init, headers });
  };

  let res = await send();
  // Auth routes return 401 for wrong passwords etc.; never refresh/redirect for those.
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    if (await refresh()) res = await send();
    // Plain module, no router here; a full reload also wipes in-memory session state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (res.status === 401) window.location.href = "/login";
  }
  return parse<T>(res);
}

export async function login(email: string, password: string) {
  setSession(await api<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));
  return currentUser!;
}

export async function register(name: string, email: string, password: string) {
  setSession(await api<Session>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }));
  return currentUser!;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  setSession(null);
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}

/** Current user, restoring the session from the cookie after a page reload. null = logged out. */
export async function getUser(): Promise<User | null> {
  if (!currentUser) await refresh();
  return currentUser;
}
