import { NextRequest, NextResponse } from "next/server";
import { parseInternshipWorkbook } from "@/lib/import-workbook";
import { getAdminUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "กรุณาเลือกไฟล์ .xlsx" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "รองรับเฉพาะไฟล์ .xlsx" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 });

  try {
    const result = parseInternshipWorkbook(await file.arrayBuffer());
    return NextResponse.json({
      fileName: file.name,
      headers: result.headers,
      rows: result.rows,
      summary: {
        total: result.rows.length,
        valid: result.rows.filter((row) => row.errors.length === 0).length,
        invalid: result.rows.filter((row) => row.errors.length > 0).length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ" }, { status: 422 });
  }
}
