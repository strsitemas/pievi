import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { adminOr401, badRequest, originAllowed } from "@/lib/http";

export const runtime = "nodejs";

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "outros";
const statuses = ["novo", "disponivel", "vendido", "oculto"];
const active = (value: unknown) => value === true || value === "true" || value === "on" || value === "1";

async function upsertCategory(client: import("pg").PoolClient, labelInput: string) {
  const label = labelInput.trim();
  const slug = slugify(label);
  const result = await client.query(
    "INSERT INTO category(name,slug,label) VALUES($1,$2,$1) ON CONFLICT(slug) DO UPDATE SET label=EXCLUDED.label RETURNING id,slug",
    [label, slug],
  );
  return result.rows[0] as { id: string; slug: string };
}

async function readPhoto(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || !value.size) return { bytes: null, mime: null };
  if (value.size > 5 * 1024 * 1024) throw new Error("A foto deve ter até 5 MB.");
  if (!value.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
  return { bytes: Buffer.from(await value.arrayBuffer()), mime: value.type };
}

export async function GET() {
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const { rows } = await query(
    `SELECT id,category_slug AS category,brand,name,sizes,status,color,
      sort_order AS "sortOrder",image IS NOT NULL AS "hasImage",created_at AS "createdAt"
     FROM product ORDER BY sort_order,created_at DESC`,
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const form = await request.formData();
  const category = String(form.get("category") || "Outros").trim();
  const brand = String(form.get("brand") || "").trim();
  const name = String(form.get("name") || "").trim();
  const status = String(form.get("status") || "disponivel");
  const color = String(form.get("color") || "#26394d");
  const sizes = String(form.get("sizes") || "").split(/[,;/]/).map((x) => x.trim()).filter(Boolean);
  if (!name || !brand || !category || !statuses.includes(status)) return badRequest("Preencha categoria, marca, nome e status válido.");
  let photo: { bytes: Buffer | null; mime: string | null };
  try { photo = await readPhoto(form.get("photo")); } catch (e) { return badRequest((e as Error).message); }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cat = await upsertCategory(client, category);
    const result = await client.query(
      `INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color,image,image_mime)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [cat.id, cat.slug, brand, name, sizes, status, /^#[0-9a-f]{6}$/i.test(color) ? color : "#26394d", photo.bytes, photo.mime],
    );
    await client.query("COMMIT");
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Não foi possível salvar a peça." }, { status: 500 });
  } finally { client.release(); }
}

export async function PUT(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const form = await request.formData();
  const id = String(form.get("id") || "");
  const category = String(form.get("category") || "").trim();
  const brand = String(form.get("brand") || "").trim();
  const name = String(form.get("name") || "").trim();
  const status = String(form.get("status") || "");
  const color = String(form.get("color") || "#26394d");
  const sizes = String(form.get("sizes") || "").split(/[,;/]/).map((x) => x.trim()).filter(Boolean);
  if (!id || !category || !brand || !name || !statuses.includes(status)) return badRequest("Preencha categoria, marca, nome e status válido.");
  let photo: { bytes: Buffer | null; mime: string | null };
  try { photo = await readPhoto(form.get("photo")); } catch (e) { return badRequest((e as Error).message); }
  const removePhoto = active(form.get("removePhoto"));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cat = await upsertCategory(client, category);
    const result = await client.query(
      `UPDATE product SET category_id=$2,category_slug=$3,brand=$4,name=$5,sizes=$6,status=$7,color=$8,
       image=CASE WHEN $9 THEN NULL::bytea WHEN $10::bytea IS NOT NULL THEN $10::bytea ELSE image END,
        image_mime=CASE WHEN $9 THEN NULL WHEN $10::bytea IS NOT NULL THEN $11 ELSE image_mime END,
        updated_at=now()
       WHERE id=$1 RETURNING id`,
      [id, cat.id, cat.slug, brand, name, sizes, status, /^#[0-9a-f]{6}$/i.test(color) ? color : "#26394d", removePhoto, photo.bytes, photo.mime],
    );
    await client.query("COMMIT");
    if (!result.rowCount) return NextResponse.json({ error: "Peça não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Não foi possível atualizar a peça." }, { status: 500 });
  } finally { client.release(); }
}

export async function PATCH(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body?.id) return badRequest("Identificador ausente.");

  if (Object.hasOwn(body, "status")) {
    const status = String(body.status || "");
    if (!statuses.includes(status)) return badRequest("Status inválido.");
    const { rowCount } = await query("UPDATE product SET status=$2,updated_at=now() WHERE id=$1", [body.id, status]);
    return rowCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Peça não encontrada." }, { status: 404 });
  }

  return badRequest("Atualização não suportada.");
}

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await adminOr401();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body?.id) return badRequest("Identificador ausente.");
  await query("DELETE FROM product WHERE id=$1", [body.id]);
  return NextResponse.json({ ok: true });
}
