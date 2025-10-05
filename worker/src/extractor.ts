export interface Extraction {
    company: string | null;
    role: string | null;
    application_date: string | null; 
    status: "applied" | "assessment" | "interview" | "offer" | "accepted" | "declined" | "rejected" | "withdrawn" | "update" | null;
    source: string | null; 
    confidence: number;  
  }
  
  export interface Env {
    AI: any;             
    MODEL_ID?: string;              
  }
  
  const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
  
  const SYSTEM_INSTRUCTIONS = `
  You are an extraction engine. Return ONLY a single JSON object (no prose) matching this TypeScript type:
  
  {
    "company": string | null,
    "role": string | null,
    "application_date": string | null,   
    "status": "applied" | "assessment" | "interview" | "offer" | "accepted" | "declined" | "rejected" | "withdrawn" | "update" | null,
    "source": string | null,
    "confidence": number                
  }
  
  Rules:
  - If unsure, use null. Never invent.
  - If the email is a rejection, status = "rejected".
  - If it's an interview invite, status = "interview".
  - If it's a general update without clear status, status = "update".
  - Prefer ISO dates (yyyy-mm-dd). If you see "Oct 2, 2025", convert to "2025-10-02".
  - Company = employer, not job board. Role = position title.
  - Output only JSON. No markdown, no commentary.
  `;
  
  export async function extractFromEmail(env: Env, emailText: string): Promise<Extraction> {
    const model = env.MODEL_ID || DEFAULT_MODEL;
  
    // Workers AI REST call (Accounts API)
    // const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/${encodeURIComponent(model)}`;
  
    const body = {
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS.trim() },
        { role: "user", content: emailText }
      ],
      // keep it deterministic-ish
      temperature: 0.2,
      max_tokens: 400
    };
  
    const data = await env.AI.run(model, body);
  
    // Cloudflare Workers AI returns { result: { response: "text ..." } } for instruct models
    const raw = data?.response ?? data?.output_text ?? "";
  
    const jsonText = sniffJSON(raw);
  
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Fallback minimal safe object
      parsed = {
        company: null, role: null, application_date: null,
        status: null, source: null, confidence: 0
      };
    }
  
    // Final normalization
    return normalizeExtraction(parsed);
  }
  
  function sniffJSON(s: string): string {
    // Extract the first {...} block
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) return s.slice(start, end + 1);
    return s.trim();
  }
  
  function normalizeExtraction(x: any): Extraction {
    const allowed = new Set(["applied","assessment","interview","offer","accepted","declined","rejected","withdrawn","update"]);
    const toStr = (v: any) => (typeof v === "string" ? v.trim() : null);
    const status = toStr(x?.status);
    const conf = Number.isFinite(+x?.confidence) ? Math.max(0, Math.min(1, +x.confidence)) : 0;
  
    // simple date normalization yyyy-mm-dd if possible
    let application_date = toStr(x?.application_date);
    if (application_date) {
      const d = new Date(application_date);
      if (!isNaN(d.getTime())) {
        const iso = d.toISOString().slice(0,10);
        application_date = iso;
      } else {
        application_date = null;
      }
    }
  
    return {
      company: toStr(x?.company),
      role: toStr(x?.role),
      application_date,
      status: status && allowed.has(status) ? (status as Extraction["status"]) : null,
      source: toStr(x?.source),
      confidence: conf
    };
  }
  