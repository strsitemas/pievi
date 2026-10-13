import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { adminOr401, originAllowed } from "@/lib/http";

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "outros";

export async function GET() {
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const { rows } = await query(
    `SELECT c.id,c.name,c.slug,c.label,count(p.id)::int AS "productCount"
     FROM category c LEFT JOIN product p ON p.category_id=c.id
     GROUP BY c.id ORDER BY c.label`,
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (name.length < 2) return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
  const slug = slugify(name);
  try {
    const { rows } = await query(
      "INSERT INTO category(name,slug,label) VALUES($1,$2,$1) ON CONFLICT(slug) DO UPDATE SET label=EXCLUDED.label RETURNING id,name,slug,label",
      [name, slug],
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch { return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 }); }
}

export async function PATCH(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  const id = String(body?.id || ""), name = String(body?.name || "").trim(), slug = slugify(name);
  if (!id || name.length < 2) return NextResponse.json({ error: "Informe a categoria e o novo nome." }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE category SET name=$2,slug=$3,label=$2 WHERE id=$1 RETURNING id,name,slug,label", [id, name, slug]);
    if (!result.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 }); }
    await client.query("UPDATE product SET category_slug=$2,updated_at=now() WHERE category_id=$1", [id, slug]);
    await client.query("COMMIT");
    return NextResponse.json(result.rows[0]);
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Não foi possível renomear. Verifique se já existe uma categoria com esse nome." }, { status: 409 });
  } finally { client.release(); }
}

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Identificador ausente." }, { status: 400 });
  const result = await query(
    "DELETE FROM category c WHERE c.id=$1 AND NOT EXISTS(SELECT 1 FROM product p WHERE p.category_id=c.id) RETURNING c.id",
    [body.id],
  );
  if (result.rowCount) return NextResponse.json({ ok: true });
  const exists = await query("SELECT 1 FROM category WHERE id=$1", [body.id]);
  return exists.rowCount
    ? NextResponse.json({ error: "A categoria ainda tem peças. Mova ou exclua essas peças antes." }, { status: 409 })
    : NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
}
