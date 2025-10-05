import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_client.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try{
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method" });
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.API_SHARED_SECRET) return res.status(401).json({ ok: false, error: "forbidden" });

    const { userId, threadId, doc } = req.body || {};
    if (!userId || !threadId || !doc) return res.status(400).json({ ok: false, error: "missing fields" });

  const db = await getDb();
  const col = db.collection(process.env.MONGODB_COLLECTION!);

  const now = new Date().toISOString();
  const payload = { ...doc, userId, threadId, updatedAt: now };
  await col.updateOne(
    { threadId },
    { $set: payload, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );

  return res.json({ ok: true });
}catch (e: any) {
  return res.status(500).json({ ok: false, error: String(e?.message || e) });
}
}
