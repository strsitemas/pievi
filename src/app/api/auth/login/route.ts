import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { originAllowed } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const body = await request.json().catch(() => null); const email = String(body?.email ?? "").trim().toLowerCase(); const password = String(body?.password ?? "");
  const { rows } = await query<{id:string,password_hash:string,active:boolean}>("SELECT id,password_hash,active FROM app_user WHERE email=$1", [email]);
  const user = rows[0];
  if (!user || !user.active || !(await bcrypt.compare(password,user.password_hash))) return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  await setSession(user.id); return NextResponse.json({ ok: true });
}
