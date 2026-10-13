import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { originAllowed } from "@/lib/http";
export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  await clearSession(); return NextResponse.json({ ok: true });
}
