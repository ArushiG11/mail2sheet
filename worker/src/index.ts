export interface Env {
  CLOUDFLARE_API_TOKEN: string; // secret
  CF_ACCOUNT_ID: string;        // from wrangler.jsonc "vars"
}
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/ai-test") {
      const payload = {
        messages: [
          { role: "system", content: "Reply with ONLY a JSON object: {ok: true}" },
          { role: "user", content: "Say hi in JSON." }
        ],
        temperature: 0.1,
        max_tokens: 50
      };

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
          body: JSON.stringify(payload)
        }
      );
      const out = await res.json();
      const text = out?.result?.response ?? "{}";
      return new Response(text, { headers: { "content-type": "application/json" } });
    }

    return new Response("Worker is up. Try /ai-test", { status: 200 });
  }
};
