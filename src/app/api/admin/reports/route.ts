import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const supabase = client();
    const { data, error } = await supabase.from("reports")
      .select("id,reason,details,status,created_at,company_id,internship_id")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const reports = (data ?? []).map((report) => {
      const [reference, ...detailLines] = report.details.split("\n");
      return { ...report, source: "report" as const, type: "แจ้งข้อมูลผิด", reference, details: detailLines.join("\n") };
    });
    const { data: submissions, error: submissionError } = await supabase
      .from("submissions").select("id,type,status,payload,created_at").order("created_at", { ascending: false });
    if (submissionError) throw submissionError;
    const suggestions = (submissions ?? []).map((submission) => {
      const payload = submission.payload as { companyName?: string; title?: string; description?: string };
      return {
        id: submission.id, source: "submission" as const, type: "เสนอข้อมูล",
        reference: `${payload.companyName ?? "ไม่ระบุบริษัท"} - ${payload.title ?? "ไม่ระบุตำแหน่ง"}`,
        reason: "เสนอข้อมูลฝึกงาน", details: payload.description ?? "", status: submission.status === "pending" ? "pending" : "reviewed",
        created_at: submission.created_at
      };
    });
    const allReports = [...reports, ...suggestions].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    return NextResponse.json({
      data: allReports,
      unreadCount: allReports.filter((report) => report.status === "pending").length
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "โหลดกล่องจดหมายไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const body = await request.json() as { id?: string; source?: "report" | "submission"; status?: string };
    if (!body.id || !["reviewed", "dismissed"].includes(body.status ?? "")) {
      return NextResponse.json({ error: "ข้อมูลสถานะรายงานไม่ถูกต้อง" }, { status: 400 });
    }
    const table = body.source === "submission" ? "submissions" : "reports";
    const nextStatus = body.source === "submission"
      ? (body.status === "dismissed" ? "rejected" : "reviewing")
      : body.status;
    const { error } = await client().from(table).update({ status: nextStatus }).eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "อัปเดตรายงานไม่สำเร็จ" }, { status: 500 });
  }
}
