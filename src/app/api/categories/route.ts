import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/supabase/auth";

type CategoryType = "organization_type" | "business_type";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า Supabase");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validType(value: unknown): value is CategoryType {
  return value === "organization_type" || value === "business_type";
}

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    const query = client().from("category_options").select("id,category_type,name,is_active").eq("is_active", true).order("name");
    const { data, error } = await (validType(type) ? query.eq("category_type", type) : query);
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "โหลดหมวดหมู่ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const body = await request.json() as { categoryType?: string; name?: string };
    if (!validType(body.categoryType) || !body.name?.trim()) return NextResponse.json({ error: "กรุณาระบุประเภทและชื่อหมวดหมู่" }, { status: 400 });
    const { data, error } = await client().from("category_options").insert({ category_type: body.categoryType, name: body.name.trim() }).select("id,category_type,name,is_active").single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "เพิ่มหมวดหมู่ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const body = await request.json() as { id?: string; name?: string };
    if (!body.id || !body.name?.trim()) return NextResponse.json({ error: "ข้อมูลหมวดหมู่ไม่ครบ" }, { status: 400 });
    const { error } = await client().from("category_options").update({ name: body.name.trim(), updated_at: new Date().toISOString() }).eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "แก้ไขหมวดหมู่ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 400 });
    const { error } = await client().from("category_options").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ลบหมวดหมู่ไม่สำเร็จ" }, { status: 500 });
  }
}
