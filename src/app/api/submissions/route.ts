import { NextRequest, NextResponse } from "next/server";
import { submissionSchema } from "@/lib/validation";
import { createServerWriteClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const parsed = submissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
    const supabase = createServerWriteClient();
    const { error } = await supabase.from("submissions").insert({
      type: "new_internship",
      payload: parsed.data,
      source_url: parsed.data.sourceUrl || null,
      status: "pending"
    });
    if (error) return NextResponse.json({ error: "บันทึกข้อมูลไม่สำเร็จ", details: error.message }, { status: 502 });
    return NextResponse.json({ message: "รับข้อมูลเข้าสู่คิวตรวจสอบแล้ว" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ส่งข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
