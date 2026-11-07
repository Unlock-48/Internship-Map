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
  companyExistsInDatabase: boolean;
  duplicateInDatabase: boolean;
  duplicateInFile: boolean;
  errors: string[];
};

const aliases: Record<keyof Omit<ImportRow, "rowNumber" | "errors" | "companyExistsInDatabase" | "duplicateInDatabase" | "duplicateInFile">, string[]> = {
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

function normalizeImportValue(value: string) {
  return value.trim().replace(/\s+/g, " ").normalize("NFKC").toLowerCase();
}

export function getImportDuplicateKey(companyNameValue: string, positionTitleValue: string): string | null {
  const companyName = normalizeImportValue(companyNameValue);
  const positionTitle = normalizeImportValue(positionTitleValue);
  return companyName && positionTitle ? `${companyName}\u001f${positionTitle}` : null;
}

function getImportRowKey(row: Pick<ImportRow, "companyName" | "positionTitle" | "jobDescription">): string | null {
  const pairKey = getImportDuplicateKey(row.companyName, row.positionTitle);
  return pairKey ? `${pairKey}\u001f${normalizeImportValue(row.jobDescription)}` : null;
}

export function validateImportRows(rows: ImportRow[]): ImportRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.universityCode && !row.universityName) errors.push("กรุณาระบุมหาวิทยาลัย");
    if (!row.academicUnitCode && !row.academicUnitName) errors.push("กรุณาระบุคณะ/ภาควิชา");
    if (!row.companyName.trim()) errors.push("กรุณาระบุชื่อสถานประกอบการ");
    if (!row.positionTitle.trim()) errors.push("กรุณาระบุตำแหน่งที่รับ");
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    const hasCoordinates = row.latitude.trim() !== ""
      && row.longitude.trim() !== ""
      && Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180;
    if (!hasCoordinates && !row.googleMapsUrl.trim()) errors.push("กรุณาระบุพิกัดหรือลิงก์ Google Maps");
    const key = getImportRowKey(row);
    const duplicateInFile = Boolean(key && seen.has(key));
    if (duplicateInFile) errors.push("ข้อมูลซ้ำกับแถวอื่นในไฟล์");
    if (key) seen.add(key);
    return { ...row, duplicateInFile, errors };
  });
}

export type ExistingImportRecord = { companyName: string; positionTitle: string; jobDescription: string };

export function classifyImportRows(rows: ImportRow[], existingCompanyNames: Set<string>, existingRecords: ExistingImportRecord[]): ImportRow[] {
  const normalizedCompanyNames = new Set([...existingCompanyNames].map(normalizeImportValue));
  const existingByCompanyAndTitle = new Map<string, Set<string>>();
  for (const record of existingRecords) {
    const key = getImportDuplicateKey(record.companyName, record.positionTitle);
    if (!key) continue;
    const descriptions = existingByCompanyAndTitle.get(key) ?? new Set<string>();
    descriptions.add(normalizeImportValue(record.jobDescription));
    existingByCompanyAndTitle.set(key, descriptions);
  }

  return rows.map((row) => {
    const companyKey = normalizeImportValue(row.companyName);
    const positionKey = getImportDuplicateKey(row.companyName, row.positionTitle);
    const matchingDescriptions = positionKey ? existingByCompanyAndTitle.get(positionKey) : undefined;
    const incomingDescription = normalizeImportValue(row.jobDescription);
    const duplicateInDatabase = Boolean(matchingDescriptions?.size
      && (matchingDescriptions.has(incomingDescription) || !incomingDescription));
    return {
      ...row,
      companyExistsInDatabase: normalizedCompanyNames.has(companyKey),
      duplicateInDatabase
    };
  });
}

const exportColumns: { key: keyof Omit<ImportRow, "rowNumber" | "errors" | "companyExistsInDatabase" | "duplicateInDatabase" | "duplicateInFile">; header: string }[] = [
  { key: "universityCode", header: "university_code" },
  { key: "universityName", header: "university_name" },
  { key: "academicUnitCode", header: "academic_unit_code" },
  { key: "academicUnitName", header: "academic_unit_name" },
  { key: "companyId", header: "company_id" },
  { key: "companyName", header: "company_name" },
  { key: "businessType", header: "business_type" },
  { key: "companyDescription", header: "company_description" },
  { key: "positionTitle", header: "position_title" },
  { key: "jobDescription", header: "job_description" },
  { key: "address", header: "address" },
  { key: "road", header: "road" },
  { key: "subdistrict", header: "subdistrict" },
  { key: "district", header: "district" },
  { key: "province", header: "province" },
  { key: "postalCode", header: "postal_code" },
  { key: "latitude", header: "latitude" },
  { key: "longitude", header: "longitude" },
  { key: "website", header: "website" },
  { key: "facebook", header: "facebook" },
  { key: "phone", header: "phone" },
  { key: "email", header: "email" },
  { key: "allUrl", header: "all_url" },
  { key: "status", header: "status" },
  { key: "lastVerifiedAt", header: "last_verified_at" },
  { key: "googleMapsUrl", header: "google_maps_url" },
  { key: "coordinatorName", header: "coordinator_name" },
  { key: "coordinatorTitle", header: "coordinator_title" },
  { key: "coordinatorPhone", header: "coordinator_phone" },
  { key: "authorizedName", header: "authorized_name" },
  { key: "authorizedTitle", header: "authorized_title" },
  { key: "businessHours", header: "business_hours" },
  { key: "advisorRecommendation", header: "advisor_recommendation" },
  { key: "advisorName", header: "advisor_name" }
];

export function createImportWorkbook(rows: ImportRow[]): XLSX.WorkBook {
  const records = rows.map((row) => ({
    ...Object.fromEntries(exportColumns.map(({ key, header }) => [header, row[key]])),
    import_errors: row.errors.join(" · ")
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(records), "ข้อมูลไม่ครบ");
  return workbook;
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
    const row = {} as Omit<ImportRow, "rowNumber" | "errors" | "companyExistsInDatabase" | "duplicateInDatabase" | "duplicateInFile">;
    for (const key of Object.keys(aliases) as Array<keyof typeof aliases>) {
      row[key] = findValue(record, aliases[key]);
    }
    const road = findValue(record, aliases.road);
    row.address = [row.address, road].filter(Boolean).join(" ");
    return { rowNumber: index + 2, ...row, companyExistsInDatabase: false, duplicateInDatabase: false, duplicateInFile: false, errors: [] };
  });
  return { headers, rows: validateImportRows(rows) };
}
