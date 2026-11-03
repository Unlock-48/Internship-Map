import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/supabase/auth";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("internships")
      .select("id,title,status,created_at,companies!inner(id,name,status,district)")
      .in("status", ["draft", "closed", "expired"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "โหลดคิวตรวจสอบไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const body = await request.json() as { internshipId?: string; action?: "approve" | "reject"; all?: boolean };
    if ((!body.internshipId && !body.all) || !body.action) return NextResponse.json({ error: "ข้อมูลคำสั่งไม่ครบ" }, { status: 400 });
    const supabase = getAdminClient();
    if (body.all) {
      if (body.action !== "approve") return NextResponse.json({ error: "ไม่รองรับการปฏิเสธทั้งหมด" }, { status: 400 });
      const { data: queue, error: queueError } = await supabase
        .from("internships")
        .select("id,company_id")
        .in("status", ["draft", "closed", "expired"]);
      if (queueError) throw queueError;
      const ids = (queue ?? []).map((item) => item.id);
      const companyIds = [...new Set((queue ?? []).map((item) => item.company_id))];
      if (ids.length) {
        const { error: internshipError } = await supabase.from("internships")
          .update({ status: "open", last_verified_at: new Date().toISOString() })
          .in("id", ids);
        if (internshipError) throw internshipError;
        const { error: companyError } = await supabase.from("companies")
          .update({ status: "active" })
          .in("id", companyIds);
        if (companyError) throw companyError;
        const { error: auditError } = await supabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "approve_all_imports",
          entity_type: "internship",
          metadata: { count: ids.length }
        });
        if (auditError) throw auditError;
      }
      return NextResponse.json({ ok: true, count: ids.length });
    }
    const { data: internship, error: findError } = await supabase.from("internships").select("id,company_id").eq("id", body.internshipId).single();
    if (findError) throw findError;
    const approved = body.action === "approve";
    const { error: internshipError } = await supabase.from("internships").update({ status: approved ? "open" : "archived", last_verified_at: approved ? new Date().toISOString() : null }).eq("id", internship.id);
    if (internshipError) throw internshipError;
    const { error: companyError } = await supabase.from("companies").update({ status: approved ? "active" : "archived" }).eq("id", internship.company_id);
    if (companyError) throw companyError;
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: approved ? "approve_import" : "reject_import", entity_type: "internship", entity_id: internship.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ" }, { status: 500 });
  }
}
