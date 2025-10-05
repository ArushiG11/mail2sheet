export interface Env {
  MONGO_GATEWAY_BASE: string;
  MONGO_GATEWAY_TOKEN?: string;
}

async function gwFetch(env: Env, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  if (env.MONGO_GATEWAY_TOKEN) headers.set("x-api-key", env.MONGO_GATEWAY_TOKEN);
  return fetch(`${env.MONGO_GATEWAY_BASE}${path}`, { ...init, headers });
}

export async function upsertApplication(env: Env, userId: string, threadId: string, doc: Record<string, any>) {
  const res = await gwFetch(env, "/api/upsert-application", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, threadId, doc })
  });
  if (!res.ok) throw new Error(`upsert failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function listRecent(env: Env, userId: string, params?: { since?: string; page?: number; limit?: number }) {
  const u = new URL(`/api/list-recent`, env.MONGO_GATEWAY_BASE);
  u.searchParams.set("userId", userId);
  if (params?.since) u.searchParams.set("since", params.since);
  if (params?.page) u.searchParams.set("page", String(params.page));
  if (params?.limit) u.searchParams.set("limit", String(params.limit));
  const res = await gwFetch(env, u.pathname + "?" + u.searchParams.toString());
  if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
  return res.json();
}
