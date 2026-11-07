import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inferJobCategoryForBackfill, inferJobTitle, isMissingJobCategory, isMissingJobTitle } from "@/lib/job-category";
import { getAdminUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type InternshipRow = {
  id: string;
  title: string;
  description: string;
  job_category: string | null;
};

async function updateIfStillMissing(
  supabase: ReturnType<typeof client>,
  row: InternshipRow,
  update: { title?: string; job_category?: string }
) {
  let query = supabase.from("internships").update({
    ...update,
    updated_at: new Date().toISOString()
  }).eq("id", row.id).eq("status", "open");

  if (update.title) {
    query = row.title == null
      ? query.is("title", null)
      : query.eq("title", row.title);
  }
  if (update.job_category) {
    query = row.job_category == null
      ? query.is("job_category", null)
      : query.eq("job_category", row.job_category);
  }

  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });

  try {
    const supabase = client();
    const rows: InternshipRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from("internships")
        .select("id,title,description,job_category")
        .eq("status", "open")
        .range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data ?? []) as InternshipRow[]);
      if (!data || data.length < 1000) break;
    }
    let updatedCategories = 0;
    let updatedTitles = 0;
    let unresolvedCategories = 0;
    let unresolvedTitles = 0;
    const failures: string[] = [];
    const auditEntries: { actor_id: string; action: string; entity_type: string; entity_id: string }[] = [];

    const processRow = async (row: InternshipRow) => {
      const inferredTitle = isMissingJobTitle(row.title) ? inferJobTitle(row.description ?? "") : undefined;
      const titleForCategory = inferredTitle ?? (isMissingJobTitle(row.title) ? "" : row.title);
      const inferredCategory = isMissingJobCategory(row.job_category)
        ? inferJobCategoryForBackfill(titleForCategory, row.description ?? "")
        : undefined;
      const update: { title?: string; job_category?: string } = {};
      if (inferredTitle) update.title = inferredTitle;
      if (inferredCategory) update.job_category = inferredCategory;

      if (isMissingJobTitle(row.title) && !inferredTitle) unresolvedTitles += 1;
      if (isMissingJobCategory(row.job_category) && !inferredCategory) unresolvedCategories += 1;
      if (!Object.keys(update).length) return;

      try {
        const changed = await updateIfStillMissing(supabase, row, update);
        if (!changed) return;
        if (update.title) updatedTitles += 1;
        if (update.job_category) updatedCategories += 1;
        auditEntries.push({
          actor_id: user.id,
          action: "auto_classify_open_internship",
          entity_type: "internship",
          entity_id: row.id
        });
      } catch (reason) {
        failures.push(`${row.id}: ${reason instanceof Error ? reason.message : "เกิดข้อผิดพลาด"}`);
      }
    };

    for (let index = 0; index < rows.length; index += 8) {
      await Promise.all(rows.slice(index, index + 8).map(processRow));
    }

    if (auditEntries.length) {
      const { error: auditError } = await supabase.from("audit_logs").insert(auditEntries);
      if (auditError) throw auditError;
    }

    return NextResponse.json({
      scanned: rows.length,
      updatedCategories,
      updatedTitles,
      unresolvedCategories,
      unresolvedTitles,
      failed: failures.length,
      errors: failures.slice(0, 10)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "จัดหมวดงานอัตโนมัติไม่สำเร็จ" }, { status: 500 });
  }
}
