export const jobCategories = [
  "ไม่ระบุ",
  "พัฒนาซอฟต์แวร์",
  "IT Support",
  "เครือข่ายและโครงสร้าง",
  "ออกแบบกราฟิกมัลติมีเดีย",
  "ข้อมูลและปัญญาประดิษฐ์",
  "การตลาดและคอนเทนต์",
  "ธุรการและทรัพยากรบุคคล",
  "บัญชีและการเงิน",
  "ขายและบริการลูกค้า",
  "ช่างเทคนิคและวิศวกรรม",
  "ขนส่งและโลจิสติกส์",
  "งานโรงแรมและบริการ",
  "อื่น ๆ"
] as const;

export type JobCategory = (typeof jobCategories)[number];

export function normalizeJobCategory(value: string | null | undefined): JobCategory {
  if (value === "พัฒนาซอฟต์แวร์และโปรแกรม") return "พัฒนาซอฟต์แวร์";
  if (value === "เครือข่ายและโครงสร้างพื้นฐาน") return "เครือข่ายและโครงสร้าง";
  if (value === "ออกแบบกราฟิกและมัลติมีเดีย") return "ออกแบบกราฟิกมัลติมีเดีย";
  return jobCategories.includes(value as JobCategory) ? value as JobCategory : "ไม่ระบุ";
}

export function inferJobCategory(title: string, description: string): JobCategory {
  const text = `${title} ${description}`.toLowerCase();
  if (/program|software|developer|programmer|web|front.?end|back.?end|full.?stack|นักพัฒนา|โปรแกรม|พัฒนาเว็บไซต์|ซอฟต์แวร์/.test(text)) return "พัฒนาซอฟต์แวร์";
  if (/support|helpdesk|it support|ซ่อม|ดูแลระบบ|ไอที/.test(text)) return "IT Support";
  if (/network|เครือข่าย|fiber|cctv|server|โครงสร้างพื้นฐาน/.test(text)) return "เครือข่ายและโครงสร้าง";
  if (/graphic|design|กราฟิก|ออกแบบ|video|วิดีโอ|animation|สื่อ/.test(text)) return "ออกแบบกราฟิกมัลติมีเดีย";
  if (/data|ข้อมูล|ai|ปัญญาประดิษฐ์|วิเคราะห์/.test(text)) return "ข้อมูลและปัญญาประดิษฐ์";
  if (/marketing|content|การตลาด|คอนเทนต์|ประชาสัมพันธ์/.test(text)) return "การตลาดและคอนเทนต์";
  if (/hr|human resource|ทรัพยากรบุคคล|บุคคล|ธุรการ/.test(text)) return "ธุรการและทรัพยากรบุคคล";
  if (/account|บัญชี|การเงิน|finance/.test(text)) return "บัญชีและการเงิน";
  if (/sales|ขาย|ลูกค้า|บริการ/.test(text)) return "ขายและบริการลูกค้า";
  if (/ช่าง|วิศว|technician|technical/.test(text)) return "ช่างเทคนิคและวิศวกรรม";
  if (/ขนส่ง|โลจิสติกส์|logistic|transport/.test(text)) return "ขนส่งและโลจิสติกส์";
  if (/โรงแรม|บริการ|hotel/.test(text)) return "งานโรงแรมและบริการ";
  return "ไม่ระบุ";
}

export function isMissingJobCategory(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return !normalized || ["ไม่ระบุ", "ไม่ระบุลักษณะงาน", "ไม่ทราบ", "ไม่ทราบลักษณะงาน", "ไม่ทราบหมวดหมู่งาน", "n/a", "ไม่มีข้อมูล", "ไม่มีข้อมูลลักษณะงาน"].includes(normalized);
}

export function isMissingJobTitle(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return !normalized || ["ไม่ระบุตำแหน่ง", "ไม่ระบุตำแหน่งงาน", "ไม่ระบุ", "ไม่ทราบ", "ไม่ทราบตำแหน่ง", "n/a", "ไม่มีข้อมูล"].includes(normalized);
}

export function inferJobCategoryForBackfill(title: string, description: string): JobCategory | undefined {
  const inferred = inferJobCategory(title, description);
  if (inferred !== "ไม่ระบุ") return inferred;
  const hasMeaningfulText = [title, description].some((value) =>
    value.trim() && !isMissingJobTitle(value) && !isMissingJobCategory(value)
  );
  return hasMeaningfulText ? "อื่น ๆ" : undefined;
}

export function inferJobTitle(description: string): string | undefined {
  const patterns = [
    /(?:ตำแหน่งที่รับ|ชื่อตำแหน่ง|ตำแหน่งงาน|ตำแหน่ง|job\s*title|position(?:\s*title)?)\s*[:：-]\s*([^\r\n]+)/i,
    /(?:รับสมัคร|รับนักศึกษาฝึกงาน)\s*(?:ในตำแหน่ง|ตำแหน่ง)\s*[:：-]?\s*([^\r\n]+)/i
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    const title = match?.[1]?.replace(/^[\s•*-]+|[\s,;。]+$/g, "").trim();
    if (title && title.length <= 120 && !isMissingJobTitle(title)) return title;
  }
  return undefined;
}
