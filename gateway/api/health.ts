import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_client.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const env = {
    hasURI: !!process.env.MONGODB_URI,
    hasDB: !!process.env.MONGODB_DB,
    hasCOL: !!process.env.MONGODB_COLLECTION,
    node: process.version
  };
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return res.status(200).json({ ok: true, env, mongo: "connected" });
  } catch (e: any) {
    console.error("health error:", e?.message);
    return res.status(500).json({ ok: false, env, error: e?.message });
  }
}
