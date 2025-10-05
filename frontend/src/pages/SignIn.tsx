import { useEffect } from "react";
import { getToken } from "../lib/session";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;       
const CALLBACK_PATH = import.meta.env.VITE_CALLBACK_PATH as string | undefined; 

export default function SignIn() {
  const nav = useNavigate();

  useEffect(() => {
    if (getToken()) nav("/app");
  }, [nav]);

  const googleRedirect = () => {
    if (!API_BASE) {
      alert("Missing VITE_API_BASE");
      return;
    }
    const cb = new URL(CALLBACK_PATH || "/auth/callback", window.location.origin);
    const url = new URL("/auth/google", API_BASE);
    url.searchParams.set("return", cb.toString());

    // show logs BEFORE navigating, and delay so you can read them
    console.log("VITE_API_BASE =", API_BASE);
    console.log("callback =", cb.toString());
    console.log("auth url =", url.toString());

    setTimeout(() => { window.location.href = url.toString(); }, 300);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <button
        onClick={googleRedirect}
        className="px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 w-full"
      >
        Continue with Google
      </button>
      <p className="text-sm text-neutral-500 mt-3">
        You’ll be redirected to Google, then back here automatically.
      </p>
    </div>
  );
}
