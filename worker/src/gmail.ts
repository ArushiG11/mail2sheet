export interface Env {
    TOKENS: KVNamespace;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
  }
  
  const OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
  const TOKEN_URL  = "https://oauth2.googleapis.com/token";
  const GMAIL_API  = "https://gmail.googleapis.com/gmail/v1";
  
  export const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "openid",
    "email",
    "profile",
  ].join(" ");
  
  
  export function authUrl(state = "dev") {
    const p = new URLSearchParams({
      client_id: "",
      redirect_uri: "",
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state
    });
    return { base: OAUTH_BASE, searchParams: p };
  }

  function q(params: Record<string, string>) {
    return new URLSearchParams(params);
  }
  
  export function buildAuthUrl(env: Env, stateJson: string) {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      access_type: "offline",
      prompt: "consent select_account",
      scope: SCOPES,
      state: stateJson,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  
  
  export async function exchangeCodeForTokens(env: Env, code: string) {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: q({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!r.ok) throw new Error(`token exchange failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: "Bearer";
      scope: string;
    }>;
  }
  
  
  export async function refreshAccessToken(env: Env, refresh_token: string) {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: q({
        refresh_token,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });
    if (!r.ok) throw new Error(`refresh failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<{ access_token: string; expires_in: number; token_type: "Bearer"; scope: string }>;
  }
  
export async function listThreads(env: Env, access_token: string, q: string, maxResults = 100, pageToken?: string) {
  const u = new URL(`${GMAIL_API}/users/me/threads`);
  u.searchParams.set("q", q);
  u.searchParams.set("maxResults", String(maxResults));
  if (pageToken) u.searchParams.set("pageToken", pageToken);
  const r = await fetch(u, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!r.ok) throw new Error(`listThreads: ${r.status} ${await r.text()}`);
  return r.json() as Promise<{ threads?: { id: string }[]; nextPageToken?: string }>;
}
  
  export async function getThread(env: Env, access_token: string, id: string) {
    const u = new URL(`${GMAIL_API}/users/me/threads/${id}`);
    u.searchParams.set("format", "full");
    const r = await fetch(u, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!r.ok) throw new Error(`getThread: ${r.status} ${await r.text()}`);
    return r.json() as Promise<any>;
  }
  
  export function decodeBody(data?: string) {
    if (!data) return "";
    // Gmail uses URL-safe base64
    const s = data.replace(/-/g, "+").replace(/_/g, "/");
    try { return atob(s); } catch { return ""; }
  }
  