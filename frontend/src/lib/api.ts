import { getToken } from "./session";
const API_BASE = import.meta.env.VITE_API_BASE as string;
const CALLBACK_PATH = import.meta.env.VITE_CALLBACK_PATH as string | undefined;

async function j(path: string, init?: RequestInit) {
  const token = getToken();
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

export const api = {
  status: () => j("/status"),
  recent: (params?: { since?: string; page?: number; limit?: number }) => {
    const u = new URL("/recent", API_BASE);
    if (params?.since) u.searchParams.set("since", params.since);
    if (params?.page) u.searchParams.set("page", String(params.page));
    if (params?.limit) u.searchParams.set("limit", String(params.limit));
    return j(u.pathname + "?" + u.searchParams.toString());
  },
  sync: () => j("/sync"),
  mirror: () => j("/mirror"),
  authGoogle: () => {
    const cb = new URL(CALLBACK_PATH || "/auth/callback", window.location.origin);
    const u = new URL("/auth/google", API_BASE);
    u.searchParams.set("return", cb.toString());
    window.location.href = u.toString();
  },
};
