import type { VercelRequest, VercelResponse } from "@vercel/node";
import { usersCol } from "../_client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: "missing fields" });

  const col = await usersCol();
  const existing = await col.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ ok: false, error: "email exists" });

  const hash = await bcrypt.hash(password, 10);
  const doc = { email: email.toLowerCase(), passwordHash: hash, createdAt: new Date() };
  const { insertedId } = await col.insertOne(doc);

  const token = jwt.sign({ sub: String(insertedId), email: doc.email }, process.env.API_JWT_SECRET!, { expiresIn: "7d" });
  return res.json({ ok: true, token, user: { id: String(insertedId), email: doc.email } });
}
