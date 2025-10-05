import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_client.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method" });

    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.API_SHARED_SECRET) return res.status(401).json({ ok: false, error: "forbidden" });

    const userId = String(req.query.userId || "");
    if (!userId) return res.status(400).json({ ok: false, error: "missing userId" });
    const since = req.query.since ? new Date(String(req.query.since)) : null;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));
    const skip = (page - 1) * limit;

    const db = await getDb();
    const col = db.collection(process.env.MONGODB_COLLECTION!);

    const query: any = { userId };
    if (since) query.updatedAt = { $gte: since.toISOString() };

    const [docs, total] = await Promise.all([
      col.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(query),
    ]);

    return res.json({ ok: true, docs, page, limit, total });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
