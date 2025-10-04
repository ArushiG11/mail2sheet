import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_client.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { threadId, doc } = req.body || {};
  if (!threadId) return res.status(400).json({ error: "threadId required" });

  const db = await getDb();
  const col = db.collection(process.env.MONGODB_COLLECTION || "applications");

  const now = new Date().toISOString();
  await col.updateOne(
    { threadId },
    { $set: { ...doc, threadId, lastUpdate: now } },
    { upsert: true }
  );

  return res.json({ ok: true });
}
