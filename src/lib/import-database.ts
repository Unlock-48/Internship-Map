import { createClient } from "@supabase/supabase-js";
import type { ExistingImportRecord } from "@/lib/import-workbook";

export async function getExistingImportData(): Promise<{
  companyNames: Set<string>;
  records: ExistingImportRecord[];
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("ต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY เพื่อตรวจสอบข้อมูลซ้ำ");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const companyNames = new Set<string>();
  const records: ExistingImportRecord[] = [];
  const pageSize = 1000;

  let start = 0;
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id,name")
      .order("id")
      .range(start, start + pageSize - 1);
    if (error) throw error;
    for (const company of data ?? []) {
      if (company.name) companyNames.add(company.name);
    }
    if ((data?.length ?? 0) < pageSize) break;
    start += pageSize;
  }

  start = 0;
  while (true) {
    const { data, error } = await supabase
      .from("internships")
      .select("title,description,companies!inner(name)")
      .order("id")
      .range(start, start + pageSize - 1);
    if (error) throw error;
    for (const internship of data ?? []) {
      const company = Array.isArray(internship.companies) ? internship.companies[0] : internship.companies;
      if (company?.name) {
        records.push({
          companyName: company.name,
          positionTitle: internship.title,
          jobDescription: internship.description ?? ""
        });
      }
    }
    if ((data?.length ?? 0) < pageSize) break;
    start += pageSize;
  }

  return { companyNames, records };
}
