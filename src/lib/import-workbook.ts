import * as XLSX from "xlsx";

export type ImportRow = {
  rowNumber: number;
  universityCode: string;
  universityName: string;
  academicUnitCode: string;
  academicUnitName: string;
  companyId: string;
  companyName: string;
  businessType: string;
  companyDescription: string;
  positionTitle: string;
  jobDescription: string;
  address: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  website: string;
  facebook: string;
  phone: string;
  email: string;
  allUrl: string;
  status: string;
  lastVerifiedAt: string;
  googleMapsUrl: string;
  coordinatorName: string;
  coordinatorTitle: string;
  coordinatorPhone: string;
  authorizedName: string;
  authorizedTitle: string;
  businessHours: string;
  advisorRecommendation: string;
  advisorName: string;
  errors: string[];
};

const aliases: Record<keyof Omit<ImportRow, "rowNumber" | "errors">, string[]> = {
  universityCode: ["university_code", "รหัสมหาวิทยาลัย"],
  universityName: ["มหาวิทยาลัย", "university", "university_name"],
  academicUnitCode: ["academic_unit_code", "unit_code", "รหัสหน่วยงาน"],
  academicUnitName: ["คณะ/ภาควิชา", "หน่วยงาน", "academic_unit", "academic_unit_name"],
  companyId: ["id", "company_id"],
  companyName: ["name", "company_name", "ชื่อสถานประกอบการ / หน่วยงาน", "ชื่อสถานประกอบการ", "ชื่อบริษัท", "บริษัท"],
  businessType: ["business_type", "ลักษณะกิจการ", "ประเภทกิจการ"],
  companyDescription: ["description", "company_description", "รายละเอียดบริษัท", "รายละเอียดสถานประกอบการ"],
  positionTitle: ["title", "position_title", "ตำแหน่งที่รับ (job_roles)", "ตำแหน่งที่รับ", "ตำแหน่งงาน", "ตำแหน่ง"],
  jobDescription: ["รายละเอียดงาน (job_description)", "รายละเอียดงาน", "job_description"],
  address: ["address", "เลขที่ / อาคาร / ซอย", "เลขที่ / อาคาร / ถนน", "ที่อยู่"],
  subdistrict: ["subdistrict", "ตำบล / แขวง", "ตำบล", "แขวง"],
  district: ["district", "อำเภอ / เขต", "อำเภอ", "เขต"],
  province: ["province", "จังหวัด"],
  postalCode: ["postal_code", "รหัสไปรษณีย์"],
  latitude: ["latitude", "ละติจูด"],
  longitude: ["longitude", "ลองจิจูด"],
  road: ["ถนน", "road"],
  website: ["website", "เว็บไซต์"],
  facebook: ["facebook", "เฟซบุ๊ก"],
  phone: ["phone", "โทรศัพท์", "เบอร์โทรศัพท์"],
  email: ["email", "อีเมล", "อีเมล์"],
  allUrl: ["All_url", "all_url", "url", "ลิงก์รวม"],
  status: ["status", "สถานะ"],
  lastVerifiedAt: ["last_verified_at", "วันที่ตรวจสอบล่าสุด"],
  googleMapsUrl: ["ลิงก์ Google Map", "Google Map", "google_maps_url"],
  coordinatorName: ["coordinator_name", "ชื่อ-สกุล ผู้ประสานงาน/HR", "ชื่อผู้ประสานงาน", "ชื่อ-สกุล ผู้ประสานงาน"],
  coordinatorTitle: ["coordinator_title", "ตำแหน่ง ผู้ประสานงาน", "ตำแหน่งผู้ประสานงาน"],
  coordinatorPhone: ["coordinator_phone", "เบอร์โทรศัพท์", "โทรศัพท์", "เบอร์โทร"],
  authorizedName: ["authorized_name", "ชื่อ-สกุล ผู้มีอำนาจลงนาม", "ชื่อผู้มีอำนาจลงนาม"],
  authorizedTitle: ["authorized_title", "ตำแหน่ง ผู้มีอำนาจลงนาม", "ตำแหน่งผู้มีอำนาจลงนาม"],
  businessHours: ["business_hours", "เวลาทำการ", "เวลาเปิดทำการ"],
  advisorRecommendation: ["advisor_recommendation", "คำแนะนำของอาจารย์นิเทศ", "คำแนะนำอาจารย์"],
  advisorName: ["advisor_name", "อาจารย์ผู้ให้คำแนะนำ", "ชื่ออาจารย์ผู้ให้คำแนะนำ"]
};

function clean(value: unknown): string {
  const result = value == null ? "" : String(value).trim();
  return ["ไม่ทราบ", "ไม่ระบุ", "ไม่มีข้อมูล", "n/a", "ไม่มี"].includes(result.toLowerCase()) ? "" : result;
}

function findValue(record: Record<string, unknown>, names: string[]): string {
  const entry = Object.entries(record).find(([key]) => names.some((name) => key.trim().toLowerCase() === name.toLowerCase()));
  return entry ? clean(entry[1]) : "";
}

function duplicateKey(row: Omit<ImportRow, "rowNumber" | "errors">): string | null {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const companyName = normalize(row.companyName);
  const positionTitle = normalize(row.positionTitle);
  const university = normalize(row.universityCode || row.universityName);
  const unit = normalize(row.academicUnitCode || row.academicUnitName);
  const location = `${normalize(row.province)}\u001f${normalize(row.googleMapsUrl)}`;
  return companyName && positionTitle ? `${university}\u001f${unit}\u001f${companyName}\u001f${location}\u001f${positionTitle}` : null;
}

export function validateImportRows(rows: ImportRow[]): ImportRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.universityCode && !row.universityName) errors.push("กรุณาระบุมหาวิทยาลัย");
    if (!row.academicUnitCode && !row.academicUnitName) errors.push("กรุณาระบุคณะ/ภาควิชา");
    if (!row.companyName.trim()) errors.push("กรุณาระบุชื่อสถานประกอบการ");
    if (!row.positionTitle.trim()) errors.push("กรุณาระบุตำแหน่งที่รับ");
    const key = duplicateKey(row);
    if (key && seen.has(key)) errors.push("ข้อมูลซ้ำกับแถวอื่นในไฟล์");
    if (key) seen.add(key);
    return { ...row, errors };
  });
}

export function parseInternshipWorkbook(buffer: ArrayBuffer): { headers: string[]; rows: ImportRow[] } {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames.includes("DATA")
    ? "DATA"
    : workbook.SheetNames.find((name) => {
      const sheet = workbook.Sheets[name];
      const firstRow = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", range: 0 })[0] ?? [];
      const normalizedHeaders = firstRow.map((header) => String(header).trim().toLowerCase());
      return normalizedHeaders.some((header) => aliases.companyName.some((alias) => header === alias.toLowerCase()))
        && normalizedHeaders.some((header) => aliases.positionTitle.some((alias) => header === alias.toLowerCase()));
    }) ?? workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error("ไม่พบ Sheet ในไฟล์ Excel");
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!records.length) throw new Error("ไม่พบข้อมูลใน Sheet ที่เลือก");

  const headers = Object.keys(records[0]);
  const rows = records.map((record, index) => {
    const row = {} as Omit<ImportRow, "rowNumber" | "errors">;
    for (const key of Object.keys(aliases) as Array<keyof typeof aliases>) {
      row[key] = findValue(record, aliases[key]);
    }
    const road = findValue(record, aliases.road);
    row.address = [row.address, road].filter(Boolean).join(" ");
    return { rowNumber: index + 2, ...row, errors: [] };
  });
  return { headers, rows: validateImportRows(rows) };
}
