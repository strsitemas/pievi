import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  const { rows } = await query<{id:string,category_slug:string,category_label:string,brand:string,name:string,color:string,image:boolean}>(
    `SELECT p.id,p.category_slug,COALESCE(c.label,p.category_slug) AS category_label,p.brand,p.name,p.color,(p.image IS NOT NULL) AS image
     FROM product p LEFT JOIN category c ON c.id=p.category_id
     WHERE p.status <> 'oculto' AND p.image IS NOT NULL ORDER BY p.sort_order,p.created_at DESC`);
  const catalog = rows.map((p) => ({ id:p.id, cat:p.category_slug, categoryLabel:p.category_label, brand:p.brand, name:p.name, color:p.color, img:p.image?`/api/public/photo/${p.id}`:"" }));
  return NextResponse.json(catalog, { headers: { "Cache-Control": "no-store" } });
}
