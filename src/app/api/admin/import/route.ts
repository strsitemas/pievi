import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { pool } from "@/lib/db";
import { adminOr401, originAllowed } from "@/lib/http";
export const runtime = "nodejs";
const slugify=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"outros";
export async function POST(r:Request){
  if(!originAllowed(r))return NextResponse.json({error:"Origem não autorizada."},{status:403});const a=await adminOr401();if(a.response)return a.response;
  const form=await r.formData();const file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Selecione uma planilha."},{status:400});if(file.size>10*1024*1024)return NextResponse.json({error:"A planilha deve ter até 10 MB."},{status:400});
  try{
    const book=XLSX.read(Buffer.from(await file.arrayBuffer()),{type:"buffer"});const sheet=book.Sheets["Catálogo"]||book.Sheets[book.SheetNames[0]];if(!sheet)throw new Error("Aba de catálogo ausente.");
    const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:""});let imported=0,ignored=0;
    const client=await pool.connect();try{await client.query("BEGIN");for(const row of rows){const normalized=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase(),String(v??"").trim()]));const category=normalized.categoria||"outros",brand=normalized.marca||"",name=normalized.nome||"";const status=(normalized.status||"disponivel").toLowerCase();if(!name||!brand||status==="oculto"){ignored++;continue;}const allowed=["novo","disponivel","vendido"].includes(status)?status:"disponivel";const slug=slugify(category);const cat=await client.query("INSERT INTO category(name,slug,label) VALUES($1,$2,$1) ON CONFLICT(slug) DO UPDATE SET label=EXCLUDED.label RETURNING id",[category,slug]);const sizes=(normalized.tamanhos||"").split(/[,;/]/).map(x=>x.trim()).filter(Boolean);const color=/^#[0-9a-f]{6}$/i.test(normalized.cor||"")?normalized.cor:"#26394d";await client.query("INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color) VALUES($1,$2,$3,$4,$5,$6,$7)",[cat.rows[0].id,slug,brand,name,sizes,allowed,color]);imported++;}await client.query("COMMIT");}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    return NextResponse.json({imported,ignored});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Falha ao importar planilha."},{status:400});}
}
