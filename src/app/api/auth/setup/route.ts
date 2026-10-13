import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { badRequest, originAllowed } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim(); const email = String(body?.email ?? "").trim().toLowerCase(); const password = String(body?.password ?? "");
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) return badRequest("Informe nome, e-mail válido e senha com pelo menos 12 caracteres.");
  const client = await (await import("@/lib/db")).pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT count(*)::int AS n FROM app_user");
    if (rows[0].n !== 0) { await client.query("ROLLBACK"); return NextResponse.json({ error: "A configuração inicial já foi concluída." }, { status: 409 }); }
    const hash = await bcrypt.hash(password, 12);
    const created = await client.query("INSERT INTO app_user(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,role", [name,email,hash]);
    await client.query("COMMIT"); await setSession(created.rows[0].id);
    return NextResponse.json({ user: created.rows[0] }, { status: 201 });
  } catch { await client.query("ROLLBACK"); return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 }); }
  finally { client.release(); }
}
