import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
export function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.SITE_URL;
  if (!origin || !configured) return false;
  try { return new URL(origin).origin === new URL(configured).origin; } catch { return false; }
}
export async function adminOr401() {
  const user = await currentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  return { user, response: null };
}
export function badRequest(message: string) { return NextResponse.json({ error: message }, { status: 400 }); }
