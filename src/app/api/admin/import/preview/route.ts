import { NextRequest, NextResponse } from "next/server";
import { classifyImportRows, parseInternshipWorkbook, validateImportRows } from "@/lib/import-workbook";
import { getExistingImportData } from "@/lib/import-database";
import { getAdminUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "กรุณาเลือกไฟล์ .xlsx" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "รองรับเฉพาะไฟล์ .xlsx" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 });

  let result: ReturnType<typeof parseInternshipWorkbook>;
  try {
    result = parseInternshipWorkbook(await file.arrayBuffer());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ" }, { status: 422 });
  }

  try {
    const { companyNames, records } = await getExistingImportData();
    const rows = validateImportRows(classifyImportRows(result.rows, companyNames, records));
    return NextResponse.json({
      fileName: file.name,
      headers: result.headers,
      rows,
      summary: {
        total: rows.length,
        valid: rows.filter((row) => row.errors.length === 0 && !row.duplicateInDatabase).length,
        invalid: rows.filter((row) => row.errors.length > 0 || row.duplicateInDatabase).length
      }
    });
  } catch (error) {
    console.error("Failed to compare imported rows with existing internships", error);
    return NextResponse.json({ error: error instanceof Error ? `ตรวจสอบรายการซ้ำกับฐานข้อมูลไม่สำเร็จ: ${error.message}` : "ตรวจสอบรายการซ้ำกับฐานข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
