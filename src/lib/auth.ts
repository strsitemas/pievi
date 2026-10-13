import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";

const COOKIE = process.env.NODE_ENV === "production" ? "__Host-pievi_session" : "pievi_session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres.");
  return value;
}
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }
export function makeToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + 8 * 60 * 60 * 1000, nonce: randomBytes(12).toString("hex") })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function verifyToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return data.exp > Date.now() ? data.sub as string : null; }
  catch { return null; }
}
export async function currentUser() {
  const jar = await cookies(); const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const id = verifyToken(token); if (!id) return null;
  const { rows } = await query<{id:string,name:string,email:string,role:string}>("SELECT id,name,email,role FROM app_user WHERE id=$1 AND active=true", [id]);
  return rows[0] ?? null;
}
export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(userId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}
export async function clearSession() { const jar = await cookies(); jar.delete(COOKIE); }
