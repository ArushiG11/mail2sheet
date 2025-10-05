import type { VercelRequest, VercelResponse } from "@vercel/node";
import { usersCol } from "../_client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: "missing fields" });

  const col = await usersCol();
  const u = await col.findOne({ email: email.toLowerCase() });
  if (!u) return res.status(401).json({ ok: false, error: "invalid credentials" });

  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, error: "invalid credentials" });

  const token = jwt.sign({ sub: String((u as any)._id), email: u.email }, process.env.API_JWT_SECRET!, { expiresIn: "7d" });
  return res.json({ ok: true, token, user: { id: String((u as any)._id), email: u.email } });
}