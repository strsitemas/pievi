import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export async function GET(){const {rows}=await query<{key:string,value:string}>("SELECT key,value FROM site_setting");return NextResponse.json(Object.fromEntries(rows.map(x=>[x.key,x.value])),{headers:{"Cache-Control":"no-store"}});}
