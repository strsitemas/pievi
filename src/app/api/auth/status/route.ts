import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET() {
  const { rows } = await query<{count:string}>("SELECT count(*)::text AS count FROM app_user");
  const user = await currentUser();
  return NextResponse.json({ setupRequired: rows[0]?.count === "0", user }, { headers: { "Cache-Control": "no-store" } });
}
