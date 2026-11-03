import * as XLSX from "xlsx";

export type ImportRow = {
  rowNumber: number;
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
  companyId: ["id", "company_id"],
  companyName: ["name", "ชื่อสถานประกอบการ / หน่วยงาน", "ชื่อสถานประกอบการ", "ชื่อบริษัท", "บริษัท"],
  businessType: ["business_type", "ลักษณะกิจการ", "ประเภทกิจการ"],
  companyDescription: ["description", "รายละเอียดบริษัท", "รายละเอียดสถานประกอบการ"],
  positionTitle: ["ตำแหน่งที่รับ (job_roles)", "ตำแหน่งที่รับ", "ตำแหน่งงาน", "ตำแหน่ง"],
  jobDescription: ["รายละเอียดงาน (job_description)", "รายละเอียดงาน", "job_description"],
  address: ["address", "เลขที่ / อาคาร / ซอย", "เลขที่ / อาคาร / ถนน", "ที่อยู่"],
  subdistrict: ["ตำบล / แขวง", "ตำบล", "แขวง"],
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
  coordinatorName: ["ชื่อ-สกุล ผู้ประสานงาน/HR", "ชื่อผู้ประสานงาน", "ชื่อ-สกุล ผู้ประสานงาน"],
  coordinatorTitle: ["ตำแหน่ง ผู้ประสานงาน", "ตำแหน่งผู้ประสานงาน"],
  coordinatorPhone: ["เบอร์โทรศัพท์", "โทรศัพท์", "เบอร์โทร"],
  authorizedName: ["ชื่อ-สกุล ผู้มีอำนาจลงนาม", "ชื่อผู้มีอำนาจลงนาม"],
  authorizedTitle: ["ตำแหน่ง ผู้มีอำนาจลงนาม", "ตำแหน่งผู้มีอำนาจลงนาม"],
  businessHours: ["เวลาทำการ", "เวลาเปิดทำการ"],
  advisorRecommendation: ["คำแนะนำของอาจารย์นิเทศ", "คำแนะนำอาจารย์"],
  advisorName: ["อาจารย์ผู้ให้คำแนะนำ", "ชื่ออาจารย์ผู้ให้คำแนะนำ"]
};

function clean(value: unknown): string {
  const result = value == null ? "" : String(value).trim();
  return ["ไม่ทราบ", "ไม่ระบุ", "ไม่มีข้อมูล", "N/A", "ไม่มี"].includes(result.toLowerCase()) ? "" : result;
}

function findValue(record: Record<string, unknown>, names: string[]): string {
  const entry = Object.entries(record).find(([key]) => names.some((name) => key.trim().toLowerCase() === name.toLowerCase()));
  return entry ? clean(entry[1]) : "";
}

export function parseInternshipWorkbook(buffer: ArrayBuffer): { headers: string[]; rows: ImportRow[] } {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("ไม่พบ Sheet ในไฟล์ Excel");
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!records.length) throw new Error("ไม่พบข้อมูลใน Sheet แรก");

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
  return { headers, rows };
}
