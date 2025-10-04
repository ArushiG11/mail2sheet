import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_client.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const col = db.collection(process.env.MONGODB_COLLECTION || "applications");
  const docs = await col.find({}).sort({ lastUpdate: -1 }).limit(10).toArray();
  return res.json({ docs });
}
