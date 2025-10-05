import { useEffect, useRef } from "react";
import { saveToken } from "../lib/session";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE as string;

export default function AuthCallback() {
  const nav = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // avoid double-run in React StrictMode
    ran.current = true;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (!code) throw new Error("Missing code");

        // 1) Exchange code for JWT
        const r = await fetch(`${API_BASE}/session/exchange?code=${encodeURIComponent(code)}`);
        const j = await r.json();
        if (!r.ok || !j.ok || !j.token) {
          const detail = j?.error ? `: ${j.error}` : "";
          throw new Error(`Exchange failed${detail}`);
        }

        // 2) Save token
        saveToken(j.token);

        // 3) Kick a sync (best-effort)
        try { await api.sync(); } catch {}

        // 4) Go to dashboard
        nav("/app", { replace: true });
      } catch (e:any) {
        alert(e.message || "Auth failed");
        nav("/", { replace: true });
      }
    })();
  }, [nav]);

  return (
    <div className="max-w-md mx-auto p-6">
      <p>Finishing sign-in…</p>
    </div>
  );
}
