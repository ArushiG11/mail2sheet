export interface Env {
    MONGO_GATEWAY_BASE: string; // e.g., https://your-vercel.vercel.app
    MONGO_GATEWAY_TOKEN?: string; // optional shared secret
  }
  
  async function post(env: Env, path: string, body: any) {
    const res = await fetch(`${env.MONGO_GATEWAY_BASE}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.MONGO_GATEWAY_TOKEN ? { "x-api-key": env.MONGO_GATEWAY_TOKEN } : {})
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Gateway ${path} ${res.status} ${await res.text()}`);
    return res.json();
  }
  
  export async function upsertApplication(env: Env, threadId: string, doc: Record<string, any>) {
    return post(env, "/api/upsert-application", { threadId, doc });
  }
  
  export async function listRecent(env: Env) {
    const res = await fetch(`${env.MONGO_GATEWAY_BASE}/api/list-recent`, {
      headers: env.MONGO_GATEWAY_TOKEN ? { "x-api-key": env.MONGO_GATEWAY_TOKEN } : {}
    });
    if (!res.ok) throw new Error(`Gateway list-recent ${res.status}`);
    return res.json();
  }
  