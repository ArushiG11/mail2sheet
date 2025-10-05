const GW = import.meta.env.VITE_GATEWAY_BASE as string;

async function j(path: string, body?: any) {
  const r = await fetch(GW + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || r.statusText);
  return data;
}
export const gw = {
  signup: (email: string, password: string) => j("/api/auth/signup", { email, password }),
  login: (email: string, password: string) => j("/api/auth/login", { email, password }),
};
