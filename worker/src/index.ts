// import jwt from "jsonwebtoken";
import { jwtVerify, SignJWT } from "jose";
import { extractFromEmail } from "./extractor";
import { upsertApplication, listRecent } from "./atlas";
import { replaceAll, appendRows } from "./sheets";
import { buildAuthUrl, exchangeCodeForTokens, refreshAccessToken, listThreads, getThread, decodeBody } from "./gmail";

const ORIGIN_WHITELIST = [
  "http://localhost:5173",
  "http://localhost:5174",
];

function cors(r: Response, origin = "*") {
  r.headers.set("Access-Control-Allow-Origin", origin);
  r.headers.set("Vary", "Origin");
  r.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "content-type, authorization");
  r.headers.set("Access-Control-Max-Age", "86400");
  return r;
}
async function signSession(env: Env, payload: Record<string, any>) {
  const secret = new TextEncoder().encode(env.API_JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

function randCode(len = 32) {
  const alph = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alph[Math.floor(Math.random() * alph.length)];
  return s;
}

async function fetchRecent(env: any, userId: string, limit = 100, params?: { since?: string; page?: number }) {
  const j = await listRecent(env, userId, { limit, since: params?.since, page: params?.page });
  return j.docs || [];
}

function toRows(docs: any[]) {
  // header
  const rows: (string | number | null)[][] = [[
    "Thread ID", "Company", "Role", "Status", "Applied Date", "Source", "Confidence"
  ]];
  for (const d of docs) {
    rows.push([
      d.threadId ?? "",
      d.company ?? "",
      d.role ?? "",
      d.status ?? "",
      d.application_date ?? "",
      d.source ?? "",
      typeof d.confidence === "number" ? Math.round(d.confidence * 100) + "%" : ""
    ]);
  }
  return rows;
}

export interface Env {
  AI: any;
  MODEL_ID?: string;

  // Gateway
  MONGO_GATEWAY_BASE: string;
  MONGO_GATEWAY_TOKEN?: string;

  // Google
  TOKENS: any;
  GOOGLE_CLIENT_ID: string;
  API_JWT_SECRET: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;

  // Sheets
  SHEETS_SPREADSHEET_ID: string;
  SHEETS_TAB?: string;
  // Cron
  CRON_SECRET?: string;
}

function parseBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1] || null;
}

async function verifyJWT(env: Env, req: Request): Promise<{ userId: string; email?: string }> {
  const token = parseBearer(req);
  if (!token) throw new Error("missing token");
  const secret = new TextEncoder().encode(env.API_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return { userId: String(payload.sub), email: (payload as any).email };
}

function pickOrigin(req: Request) {
  const o = req.headers.get("Origin") || "";
  return ORIGIN_WHITELIST.includes(o) ? o : "*";
}

const REFRESH_KEY = (userId: string) => `refresh:${userId}`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = pickOrigin(req);
    if (req.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }), origin);
    }

    const url = new URL(req.url);

    if (url.pathname === "/kv-write") {
  await env.TOKENS.put("refresh_token", "TEST_TOKEN");
  return new Response("wrote", { status: 200 });
}

// // sanity: read from KV
if (url.pathname === "/kv-read") {
  const v = await env.TOKENS.get("refresh_token");
  return Response.json({ value: v });
}

// if (url.pathname === "/reset-auth") {
//   await env.TOKENS.delete("refresh_token");
//   return new Response("deleted", { status: 200 });
// }

    // 1) Start OAuth
    if (url.pathname === "/auth/google") {
      if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
      const returnTo = url.searchParams.get("return");
  if (!returnTo) return cors(new Response("Missing return", { status: 400 }));
      const state = JSON.stringify({ returnTo });
      const redirect = buildAuthUrl(env, state);
      return Response.redirect(redirect, 302);
    }

    // 2) OAuth callback
    if (url.pathname === "/oauth/google/callback") {
      const code = url.searchParams.get("code");
      const stateRaw = url.searchParams.get("state");
      if (!code || !stateRaw) return new Response("Missing code/state", { status: 400 });
    
      let returnTo = "";
      try {
        const st = JSON.parse(stateRaw);
        returnTo = String(st.returnTo || "");
      } catch {}
      if (!returnTo) return new Response("Missing returnTo", { status: 400 });
    
      try {
        // 1) exchange code for tokens
        const tokens = await exchangeCodeForTokens(env, code);
        if (!tokens.refresh_token) {
          return new Response("No refresh_token. Remove app access and try again.", { status: 400 });
        }
    
        // 2) pull userinfo
        const uinfoResp = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        });
        if (!uinfoResp.ok) return new Response("userinfo failed", { status: 500 });
        const uinfo = await uinfoResp.json() as { sub: string; email?: string };
    
        // 3) store refresh per user
        await env.TOKENS.put(`refresh:${uinfo.sub}`, tokens.refresh_token, { httpMetadata: { cacheControl: "no-store" } });
    
        // 4) mint session JWT
        const session = await signSession(env, { sub: uinfo.sub, email: uinfo.email });
    
        // 5) create one-time exchange code
        const oneTime = randCode(32);
        await env.TOKENS.put(`session:${oneTime}`, session, { expirationTtl: 300 }); // 5 min TTL
    
        // 6) Redirect back to frontend with ?code=...
        const cb = new URL(returnTo);
        cb.searchParams.set("code", oneTime);
        return Response.redirect(cb.toString(), 302);
    
      } catch (e: any) {
        return new Response("Callback error: " + String(e?.message || e), { status: 500 });
      }
    }
    

    // 3) One-click sync (polls, extracts, upserts)
    if (url.pathname === "/sync") {

      try{
      const { userId } = await verifyJWT(env, req);
      const refresh = await env.TOKENS.get(`refresh:${userId}`);
      if (!refresh) return cors(new Response("Connect Google first at /auth/google", { status: 400 }));
      const { access_token } = await refreshAccessToken(env, refresh);

      const since = await env.TOKENS.get(`lastsync:${userId}`);
      const newerThanDays = 14; // widen a bit when incremental
      const recencyFilter = since ? `after:${Math.floor(new Date(since).getTime()/1000)}` : `newer_than:${newerThanDays}d`;
      const query = [
        'category:primary',
        '(',
          'from:(lever.co OR greenhouse.io OR workday OR jazzhr OR smartrecruiters OR icims OR breezy.hr OR ashbyhq.com OR greenhousemail.io OR myworkdayjobs.com)',
          'OR subject:(application OR interview OR offer OR rejection)'
        ,')',
        '-subject:(newsletter OR digest OR promo OR sale OR unsubscribe)',
        recencyFilter
      ].join(" ");

      let pageToken: string | undefined = undefined;
      let processed = 0;
      const maxPages = 5; // safety cap
      for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        const page = await listThreads(env, access_token, query, 100, pageToken);
        const ids = (page.threads || []).map(t => t.id);
        for (const id of ids) {
          const thread = await getThread(env, access_token, id);
          const msgs = thread.messages || [];
          const latest = msgs.at(-1);
          const parts = latest?.payload?.parts || [];
          let text = "";
          const plain = parts.find((p: any) => p.mimeType === "text/plain");
          const html  = parts.find((p: any) => p.mimeType === "text/html");
          if (plain?.body?.data) {
            text = decodeBody(plain.body.data);
          } else if (html?.body?.data) {
            const raw = decodeBody(html.body.data);
            text = raw.replace(/<[^>]+>/g, " ");
          } else if (latest?.payload?.body?.data) {
            text = decodeBody(latest.payload.body.data);
          }
          if (!text) continue;
          const extraction = await extractFromEmail(env, text);
          const looksJobLike = (
            !!extraction.status || !!extraction.role || !!extraction.company || (extraction.confidence >= 0.5)
          );
          if (!looksJobLike) continue; // skip non-application emails
          await upsertApplication(env, userId, id, { ...extraction });
          processed++;
        }
        if (!page.nextPageToken) break;
        pageToken = page.nextPageToken;
      }
      await env.TOKENS.put(`lastsync:${userId}`, new Date().toISOString());

      return cors(Response.json({ ok: true, processed }), origin);
    } catch (e:any) {
      return cors(Response.json({ ok: false, error: String(e?.message || e) }, { status: 400 }), origin);
    }
  }

  if (url.pathname === "/recent") {
    try{
      const { userId } = await verifyJWT(env, req);
      const refresh = await env.TOKENS.get(`refresh:${userId}`);
      const since = url.searchParams.get("since") || undefined;
      const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined;
      const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50;
      const j = await listRecent(env, userId, { since, page, limit });
      return cors(Response.json({ ok: true, ...j }), origin);
    }
    catch (e:any) {
      return cors(Response.json({ ok: false, error: "Unauthorized" }, { status: 401 }), origin);
    }
  }

  if (url.pathname === "/session/exchange") {
    const codeParam = new URL(req.url).searchParams.get("code");
    if (!codeParam) return cors(Response.json({ ok: false, error: "Missing code" }, { status: 400 }), origin);
    const token = await env.TOKENS.get(`session:${codeParam}`);
    if (!token) return cors(Response.json({ ok: false, error: "Invalid or expired code" }, { status: 400 }), origin);
    await env.TOKENS.delete(`session:${codeParam}`);
    return cors(Response.json({ ok: true, token }), origin);
  }


  if (url.pathname === "/status") {
    try {
      const { userId } = await verifyJWT(env, req);
      const has = !!(await env.TOKENS.get(`refresh:${userId}`));
      const docsCount = 0; // you can sample recent later if you want
      return cors(Response.json({ ok: true, gmailConnected: has, recentSample: docsCount, model: env.MODEL_ID }), origin);
    } catch {
      return cors(Response.json({ ok: false, error: "Unauthorized" }, { status: 401 }), origin);
    }
  }

  if (url.pathname === "/mirror") {
    try {
      const { userId } = await verifyJWT(env, req);
      const refresh = await env.TOKENS.get(`refresh:${userId}`);
    if (!refresh) return cors(new Response("Connect Google first at /auth/google", { status: 400 }));
  
    const { access_token } = await refreshAccessToken(env, refresh);
    const docs = await fetchRecent(env, userId, 200, { since: new Date(Date.now() - 7*24*60*60*1000).toISOString() });
    const headers = ["Thread ID","Company","Role","Status","Applied Date","Source","Confidence"];
    const rows = [headers, ...docs.map((d:any) => [
      d.threadId ?? "", d.company ?? "", d.role ?? "", d.status ?? "",
      d.application_date ?? "", d.source ?? "",
      typeof d.confidence === "number" ? Math.round(d.confidence * 100) + "%" : (d.confidence ?? "")
    ])];
    const sheetId = env.SHEETS_SPREADSHEET_ID;
    const tab = `${env.SHEETS_TAB || "Applications"}_${userId}`;
    await replaceAll(access_token, sheetId, tab, rows);

    return cors(Response.json({ ok: true, wrote: rows.length - 1 }));
  } catch (e:any) {
    return cors(Response.json({ ok: false, error: String(e?.message || e) }, { status: 400 }));
  }
  }
  
  // Append just the most recent docs (e.g., after a sync)
  if (url.pathname === "/mirror/append") {
    try {
      const { userId } = await verifyJWT(env, req);
  
      const refresh = await env.TOKENS.get(`refresh:${userId}`);
      if (!refresh) return cors(new Response("Connect Google first at /auth/google", { status: 400 }));
  
      const { access_token } = await refreshAccessToken(env, refresh);
  
      const docs = await fetchRecent(env, userId, 50, { since: new Date(Date.now() - 7*24*60*60*1000).toISOString() });
  
      const rows = docs.map((d:any) => [
        d.threadId ?? "", d.company ?? "", d.role ?? "", d.status ?? "",
        d.application_date ?? "", d.source ?? "",
        typeof d.confidence === "number" ? Math.round(d.confidence * 100) + "%" : (d.confidence ?? "")
      ]);
  
      const sheetId = env.SHEETS_SPREADSHEET_ID;
      const tab = `${env.SHEETS_TAB || "Applications"}_${userId}`;
      await appendRows(access_token, sheetId, tab, rows);
  
      return cors(Response.json({ ok: true, appended: rows.length }));
    } catch (e:any) {
      return cors(Response.json({ ok: false, error: String(e?.message || e) }, { status: 400 }));
    }
  }

    if (url.pathname === "/") {
      return new Response("Worker up. Use /auth/google → consent, then /sync.", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }
};
