import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null,{status:404});
  const { rows } = await query<{image:Buffer|null,image_mime:string|null}>("SELECT image,image_mime FROM product WHERE id=$1 AND status <> 'oculto'",[id]);
  const row=rows[0]; if(!row?.image) return new NextResponse(null,{status:404});
  return new NextResponse(new Uint8Array(row.image),{headers:{"Content-Type":row.image_mime||"application/octet-stream","Cache-Control":"public, max-age=300"}});
}
