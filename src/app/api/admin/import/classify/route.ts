import { NextRequest, NextResponse } from "next/server";
import { classifyImportRows, validateImportRows, type ImportRow } from "@/lib/import-workbook";
import { getExistingImportData } from "@/lib/import-database";
import { importRowSchema } from "@/lib/validation";
import { getAdminUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });

  let body: { rows?: unknown };
  try {
    body = await request.json() as { rows?: unknown };
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 1000) {
    return NextResponse.json({ error: "กรุณาระบุข้อมูล 1–1,000 แถวเพื่อแยกกลุ่ม" }, { status: 400 });
  }
  const parsedRows = body.rows.map((row) => importRowSchema.safeParse(row));
  const invalidRowIndex = parsedRows.findIndex((result) => !result.success);
  if (invalidRowIndex >= 0) {
    return NextResponse.json({ error: `ข้อมูลแถวที่ ${invalidRowIndex + 1} ไม่ถูกต้อง` }, { status: 400 });
  }

  try {
    const rows = parsedRows.map((result) => result.data) as ImportRow[];
    const { companyNames, records } = await getExistingImportData();
    const classifiedRows = validateImportRows(classifyImportRows(rows, companyNames, records));
    return NextResponse.json({
      rows: classifiedRows,
      summary: {
        total: classifiedRows.length,
        existing: classifiedRows.filter((row) => row.duplicateInDatabase).length,
        new: classifiedRows.filter((row) => !row.duplicateInDatabase).length
      }
    });
  } catch (error) {
    console.error("Failed to reclassify import rows", error);
    return NextResponse.json({
      error: error instanceof Error ? `แยกกลุ่มข้อมูลกับฐานข้อมูลไม่สำเร็จ: ${error.message}` : "แยกกลุ่มข้อมูลกับฐานข้อมูลไม่สำเร็จ"
    }, { status: 500 });
  }
}
