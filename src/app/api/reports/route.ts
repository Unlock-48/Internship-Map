import { NextRequest, NextResponse } from "next/server";
import { reportSchema } from "@/lib/validation";
import { createServerWriteClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  const supabase = createServerWriteClient();
  const { error } = await supabase.from("reports").insert({
    reason: parsed.data.reason,
    details: `${parsed.data.reference}\n${parsed.data.details}`,
    status: "pending"
  });
  if (error) return NextResponse.json({ error: "บันทึกรายงานไม่สำเร็จ", details: error.message }, { status: 502 });
  return NextResponse.json({ message: "รับรายงานเข้าสู่คิวตรวจสอบแล้ว" }, { status: 201 });
}
