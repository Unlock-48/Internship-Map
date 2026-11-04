import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/supabase/auth";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า Supabase Service Role Key");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase" }, { status: 503 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const universityId = request.nextUrl.searchParams.get("universityId");
    let unitsQuery = supabase
      .from("academic_units")
      .select("id,university_id,parent_id,code,name,unit_type,is_active")
      .eq("is_active", true)
      .order("name");
    if (universityId) unitsQuery = unitsQuery.eq("university_id", universityId);

    const [{ data: universities, error: universitiesError }, { data: units, error: unitsError }] = await Promise.all([
      supabase.from("universities")
        .select("id,code,name,short_name,province")
        .eq("is_active", true)
        .order("name"),
      unitsQuery
    ]);

    if (universitiesError) throw universitiesError;
    if (unitsError) throw unitsError;
    return NextResponse.json({ data: { universities: universities ?? [], units: units ?? [] } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "โหลดรายชื่อมหาวิทยาลัยและหน่วยงานไม่สำเร็จ"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });

  try {
    const body = await request.json() as {
      kind?: "university" | "unit";
      code?: string;
      name?: string;
      shortName?: string;
      province?: string;
      universityId?: string;
      parentId?: string;
      unitType?: string;
    };
    const code = body.code?.trim().toUpperCase();
    const name = body.name?.trim();
    if (!code || !/^[A-Z0-9_-]{2,32}$/.test(code) || !name || name.length > 255) {
      return NextResponse.json({ error: "กรุณาระบุรหัส (2-32 ตัวอักษรภาษาอังกฤษ/ตัวเลข) และชื่อให้ถูกต้อง" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (body.kind === "university") {
      const { data, error } = await supabase.from("universities").insert({
        code,
        name,
        short_name: body.shortName?.trim() || null,
        province: body.province?.trim() || null
      }).select("id,code,name,short_name,province").single();
      if (error) throw error;
      const { error: auditError } = await supabase.from("audit_logs").insert({
        actor_id: admin.id,
        action: "create_university",
        entity_type: "university",
        entity_id: data.id
      });
      if (auditError) throw auditError;
      return NextResponse.json({ data }, { status: 201 });
    }

    const allowedUnitTypes = ["campus", "faculty", "department", "program", "other"];
    if (body.kind !== "unit" || !body.universityId || !allowedUnitTypes.includes(body.unitType ?? "")) {
      return NextResponse.json({ error: "ข้อมูลหน่วยงานไม่ครบหรือประเภทหน่วยงานไม่ถูกต้อง" }, { status: 400 });
    }
    if (body.parentId) {
      const { data: parent, error: parentError } = await supabase.from("academic_units")
        .select("id,university_id")
        .eq("id", body.parentId)
        .maybeSingle();
      if (parentError) throw parentError;
      if (!parent || parent.university_id !== body.universityId) {
        return NextResponse.json({ error: "หน่วยงานแม่ต้องอยู่ในมหาวิทยาลัยเดียวกัน" }, { status: 400 });
      }
    }
    const { data, error } = await supabase.from("academic_units").insert({
      university_id: body.universityId,
      parent_id: body.parentId || null,
      code,
      name,
      unit_type: body.unitType
    }).select("id,university_id,parent_id,code,name,unit_type,is_active").single();
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "create_academic_unit",
      entity_type: "academic_unit",
      entity_id: data.id
    });
    if (auditError) throw auditError;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "เพิ่มมหาวิทยาลัยหรือหน่วยงานไม่สำเร็จ"
    }, { status: 500 });
  }
}
