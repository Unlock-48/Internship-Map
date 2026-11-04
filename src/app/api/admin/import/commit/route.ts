import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importRowSchema } from "@/lib/validation";
import { inferJobCategory } from "@/lib/job-category";
import { inferOrganizationType } from "@/lib/organization-type";
import { extractGoogleMapsCoordinates } from "@/lib/google-maps";
import { getAdminUser } from "@/lib/supabase/auth";
import { createHash, randomUUID } from "node:crypto";

export const runtime = "nodejs";

type ImportRow = ReturnType<typeof importRowSchema.parse>;

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "");
  return slug || `company-${Date.now()}`;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("ต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY ก่อนนำเข้าข้อมูล");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function numberOrNull(value: string) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) ? parsed : null;
}

function companyStatus(value: string, fallback: "active" | "inactive" | "archived" = "inactive") {
  return value === "active" || value === "inactive" || value === "archived" ? value : fallback;
}

function duplicateKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function matchesSelectedValue(value: string, ...candidates: Array<string | null | undefined>) {
  const normalized = duplicateKey(value);
  return !normalized || candidates.some((candidate) => candidate && duplicateKey(candidate) === normalized);
}

function isBlank(value: unknown) {
  return value == null || (typeof value === "string" && !value.trim());
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  let supabase: ReturnType<typeof getAdminClient> | undefined;
  let batchId: string | undefined;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const universityId = formData.get("universityId");
    const academicUnitId = formData.get("academicUnitId");
    const rowsText = formData.get("rows");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "กรุณาแนบไฟล์ Excel .xlsx ต้นฉบับ" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 });
    if (typeof universityId !== "string" || typeof academicUnitId !== "string" || typeof rowsText !== "string") {
      return NextResponse.json({ error: "กรุณาระบุมหาวิทยาลัย หน่วยงาน และข้อมูลนำเข้า" }, { status: 400 });
    }
    const rawRows = JSON.parse(rowsText) as unknown;
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสำหรับนำเข้า" }, { status: 400 });
    }
    if (rawRows.length > 1000) return NextResponse.json({ error: "นำเข้าได้ครั้งละไม่เกิน 1,000 แถว" }, { status: 400 });

    const rows = rawRows.map((row) => importRowSchema.parse(row));
    supabase = getAdminClient();
    const { data: academicUnit, error: unitError } = await supabase
      .from("academic_units")
      .select("id,code,name,university_id,universities!inner(id,code,name)")
      .eq("id", academicUnitId)
      .eq("university_id", universityId)
      .eq("is_active", true)
      .maybeSingle();
    if (unitError) throw unitError;
    if (!academicUnit) return NextResponse.json({ error: "หน่วยงานที่เลือกไม่อยู่ในมหาวิทยาลัยนี้ หรือถูกปิดใช้งาน" }, { status: 400 });
    const university = Array.isArray(academicUnit.universities) ? academicUnit.universities[0] : academicUnit.universities;
    if (!university?.code || !university.name || !academicUnit.code || !academicUnit.name) throw new Error("ข้อมูลรหัสหรือชื่อมหาวิทยาลัย/หน่วยงานไม่ครบ");
    const mismatchedRows = rows.flatMap((row) => {
      const universityValue = row.universityCode || row.universityName;
      const unitValue = row.academicUnitCode || row.academicUnitName;
      const errors = [];
      if (!matchesSelectedValue(universityValue, university.code, university.name)) {
        errors.push(`แถว ${row.rowNumber}: มหาวิทยาลัย "${universityValue}" ไม่ตรงกับ ${university.name}`);
      }
      if (!matchesSelectedValue(unitValue, academicUnit.code, academicUnit.name)) {
        errors.push(`แถว ${row.rowNumber}: หน่วยงาน "${unitValue}" ไม่ตรงกับ ${academicUnit.name}`);
      }
      return errors;
    });
    if (mismatchedRows.length) {
      return NextResponse.json({
        error: `ข้อมูลในไฟล์ไม่ตรงกับมหาวิทยาลัย/หน่วยงานที่เลือก: ${mismatchedRows.slice(0, 10).join(" · ")}`
      }, { status: 400 });
    }
    const normalizedRows = rows.map((row) => ({
      ...row,
      universityCode: university.code,
      academicUnitCode: academicUnit.code
    }));
    const fileBytes = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash("sha256").update(fileBytes).digest("hex");
    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        university_id: university.id,
        academic_unit_id: academicUnit.id,
        file_name: file.name,
        file_size_bytes: file.size,
        file_sha256: fileHash,
        status: "processing",
        total_rows: normalizedRows.length,
        created_by: admin.id
      })
      .select("id")
      .single();
    if (batchError) throw batchError;
    batchId = batch.id;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const storagePath = `${university.code}/${academicUnit.code}/${batch.id}/${safeFileName}`;
    const { error: storageError } = await supabase.storage
      .from("internship-imports")
      .upload(storagePath, fileBytes, { contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", upsert: false });
    if (storageError) throw storageError;
    const { error: batchStorageError } = await supabase
      .from("import_batches")
      .update({ storage_path: storagePath })
      .eq("id", batch.id);
    if (batchStorageError) throw batchStorageError;

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const companyCache = new Map<string, string>();
    const academicUnitCache = new Map<string, string>();
    const batchRows: {
      batch_id: string;
      source_row_number: number;
      outcome: "imported" | "updated" | "skipped" | "error";
      source_data: ImportRow;
      internship_id: string | null;
    }[] = [];

    for (const row of normalizedRows as ImportRow[]) {
      let rowChanged = false;
      const companyName = row.companyName || "ไม่ระบุบริษัท";
      const positionTitle = row.positionTitle || "ไม่ระบุตำแหน่ง";
      const companyCacheKey = [
        duplicateKey(companyName),
        duplicateKey(row.province),
        duplicateKey(row.district),
        duplicateKey(row.googleMapsUrl)
      ].join("\u001f");
      const universityCode = row.universityCode.trim() || "CMRU";
      const academicUnitCode = row.academicUnitCode.trim() || "COMSCI";
      const academicUnitKey = `${universityCode.toUpperCase()}:${academicUnitCode.toUpperCase()}`;
      let academicUnitId = academicUnitCache.get(academicUnitKey);
      if (!academicUnitId) {
        const { data: academicUnit, error: academicUnitError } = await supabase
          .from("academic_units")
          .select("id,universities!inner(code)")
          .eq("code", academicUnitCode)
          .eq("universities.code", universityCode)
          .eq("is_active", true)
          .maybeSingle();
        if (academicUnitError) throw academicUnitError;
        if (!academicUnit) {
          throw new Error(`ไม่พบหน่วยงานรหัส ${academicUnitCode} ในมหาวิทยาลัยรหัส ${universityCode}`);
        }
        const resolvedAcademicUnitId = academicUnit.id;
        if (!resolvedAcademicUnitId) throw new Error(`หน่วยงาน ${academicUnitCode} ไม่มีรหัสในฐานข้อมูล`);
        academicUnitId = resolvedAcademicUnitId;
        academicUnitCache.set(academicUnitKey, resolvedAcademicUnitId);
      }
      if (!academicUnitId) throw new Error(`ไม่สามารถระบุหน่วยงาน ${academicUnitCode} ของ ${universityCode} ได้`);
      const { data: byId, error: idError } = row.companyId
        ? await supabase.from("companies").select("*").eq("id", row.companyId).maybeSingle()
        : { data: null, error: null };
      if (idError) throw idError;
      const cachedCompanyId = companyCache.get(companyCacheKey);
      const { data: existingCompanies, error: findError } = cachedCompanyId || byId
        ? { data: [], error: null }
        : await supabase.from("companies").select("*").ilike("name", companyName).limit(20);
      if (findError) throw findError;

      const matchingCompanies = existingCompanies?.filter((company) => duplicateKey(company.name) === duplicateKey(companyName)) ?? [];
      const sameLocation = row.province || row.district || row.googleMapsUrl
        ? matchingCompanies.find((company) =>
          (!row.province || duplicateKey(company.province) === duplicateKey(row.province))
          && (!row.district || duplicateKey(company.district) === duplicateKey(row.district))
          && (!row.googleMapsUrl || !company.google_maps_url || duplicateKey(company.google_maps_url) === duplicateKey(row.googleMapsUrl))
        )
        : undefined;
      const existing = byId
        ?? (cachedCompanyId ? { id: cachedCompanyId } : undefined)
        ?? sameLocation
        ?? (matchingCompanies.length === 1 && !row.province && !row.district && !row.googleMapsUrl ? matchingCompanies[0] : undefined);
      let companyId = existing?.id;
      if (!companyId) {
        const { data: company, error: companyError } = await supabase.from("companies").insert({
          name: companyName,
          slug: `${slugify(companyName)}-${Date.now()}-${imported}`,
          business_type: row.businessType || null,
          organization_type: inferOrganizationType(row.businessType),
          description: row.companyDescription || null,
          address: row.address || "ไม่ระบุ",
          district: row.district || "ไม่ระบุ",
          province: row.province || "ไม่ระบุ",
          postal_code: row.postalCode || null,
          latitude: extractGoogleMapsCoordinates(row.googleMapsUrl)?.latitude ?? numberOrNull(row.latitude),
          longitude: extractGoogleMapsCoordinates(row.googleMapsUrl)?.longitude ?? numberOrNull(row.longitude),
          website: row.website || row.allUrl || null,
          google_maps_url: row.googleMapsUrl || null,
          facebook: row.facebook || null,
          phone: row.phone || null,
          email: row.email || null,
          coordinator_name: row.coordinatorName || null,
          coordinator_title: row.coordinatorTitle || null,
          coordinator_phone: row.coordinatorPhone || null,
          authorized_name: row.authorizedName || null,
          authorized_title: row.authorizedTitle || null,
          business_hours: row.businessHours || null,
          advisor_recommendation: row.advisorRecommendation || null,
          advisor_name: row.advisorName || null,
          status: companyStatus(row.status, "active"),
          last_verified_at: row.lastVerifiedAt || null
        }).select("id").single();
        if (companyError) throw companyError;
        companyId = company.id;
      } else {
        const { data: currentCompany, error: currentCompanyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .single();
        if (currentCompanyError) throw currentCompanyError;
        const companyUpdate: Record<string, string | number | null> = {};
        if (isBlank(currentCompany.business_type) && row.businessType) {
          companyUpdate.business_type = row.businessType;
        }
        if (isBlank(currentCompany.organization_type) && row.businessType) {
          companyUpdate.organization_type = inferOrganizationType(row.businessType);
        }
        if (isBlank(currentCompany.description) && row.companyDescription) companyUpdate.description = row.companyDescription;
        if (isBlank(currentCompany.address) && row.address) companyUpdate.address = row.address;
        if (isBlank(currentCompany.district) && row.district) companyUpdate.district = row.district;
        if (isBlank(currentCompany.province) && row.province) companyUpdate.province = row.province;
        if (isBlank(currentCompany.postal_code) && row.postalCode) companyUpdate.postal_code = row.postalCode;
        const importedCoordinates = extractGoogleMapsCoordinates(row.googleMapsUrl);
        if (isBlank(currentCompany.latitude) && importedCoordinates) {
          companyUpdate.latitude = importedCoordinates.latitude;
        } else if (isBlank(currentCompany.latitude) && row.latitude) {
          companyUpdate.latitude = numberOrNull(row.latitude);
        }
        if (isBlank(currentCompany.longitude) && importedCoordinates) {
          companyUpdate.longitude = importedCoordinates.longitude;
        } else if (isBlank(currentCompany.longitude) && row.longitude) {
          companyUpdate.longitude = numberOrNull(row.longitude);
        }
        const fill = (column: string, value: string) => {
          if (isBlank(currentCompany[column]) && value) companyUpdate[column] = value;
        };
        fill("website", row.website || row.allUrl);
        fill("google_maps_url", row.googleMapsUrl);
        fill("facebook", row.facebook);
        fill("phone", row.phone);
        fill("email", row.email);
        if (isBlank(currentCompany.status) && row.status) companyUpdate.status = companyStatus(row.status);
        fill("last_verified_at", row.lastVerifiedAt);
        fill("coordinator_name", row.coordinatorName);
        fill("coordinator_title", row.coordinatorTitle);
        fill("coordinator_phone", row.coordinatorPhone);
        fill("authorized_name", row.authorizedName);
        fill("authorized_title", row.authorizedTitle);
        fill("business_hours", row.businessHours);
        fill("advisor_recommendation", row.advisorRecommendation);
        fill("advisor_name", row.advisorName);
        if (Object.keys(companyUpdate).length) {
          const { error: updateError } = await supabase.from("companies").update(companyUpdate).eq("id", companyId);
          if (updateError) throw updateError;
          rowChanged = true;
        }
      }
      if (!companyId) throw new Error(`ไม่สามารถระบุรหัสสถานประกอบการสำหรับ ${companyName}`);
      companyCache.set(companyCacheKey, companyId);

      const { data: existingInternships, error: internshipFindError } = await supabase
        .from("internships")
        .select("id,title,description,job_category,academic_unit_id")
        .eq("company_id", companyId);
      if (internshipFindError) throw internshipFindError;
      const duplicate = positionTitle.trim()
        ? existingInternships?.find((internship) =>
          internship.academic_unit_id === academicUnitId
          && duplicateKey(internship.title) === duplicateKey(positionTitle))
        : undefined;
      if (duplicate) {
        const internshipUpdate: Record<string, string> = {};
        if (isBlank(duplicate.description) && row.jobDescription) {
          internshipUpdate.description = row.jobDescription;
        }
        if (isBlank(duplicate.job_category) && row.jobDescription) {
          internshipUpdate.job_category = inferJobCategory(positionTitle, row.jobDescription);
        }
        if (Object.keys(internshipUpdate).length) {
          const { error: updateError } = await supabase.from("internships").update(internshipUpdate).eq("id", duplicate.id);
          if (updateError) throw updateError;
          rowChanged = true;
        }
        if (rowChanged) updated++;
        else skipped++;
        batchRows.push({
          batch_id: batch.id,
          source_row_number: row.rowNumber,
          outcome: rowChanged ? "updated" : "skipped",
          source_data: row,
          internship_id: duplicate.id
        });
        const { error: sourceError } = await supabase.from("opportunity_sources").upsert({
          internship_id: duplicate.id,
          academic_unit_id: academicUnit.id,
          batch_id: batch.id,
          source_row_number: row.rowNumber
        }, { onConflict: "batch_id,source_row_number" });
        if (sourceError) throw sourceError;
        const { error: eligibleUnitError } = await supabase.from("internship_eligible_units").upsert({
          internship_id: duplicate.id,
          academic_unit_id: academicUnit.id
        }, { onConflict: "internship_id,academic_unit_id" });
        if (eligibleUnitError) throw eligibleUnitError;
        continue;
      }

      const { data: createdInternship, error: internshipError } = await supabase.from("internships").insert({
        company_id: companyId,
        academic_unit_id: academicUnitId,
        title: positionTitle,
        job_category: inferJobCategory(positionTitle, row.jobDescription),
        description: row.jobDescription || "ไม่ระบุ",
        status: "open",
        work_mode: "undisclosed",
        allowance_type: "undisclosed",
        all_universities: false,
        last_verified_at: null
      }).select("id").single();
      if (internshipError) throw internshipError;
      imported++;
      batchRows.push({
        batch_id: batch.id,
        source_row_number: row.rowNumber,
        outcome: "imported",
        source_data: row,
        internship_id: createdInternship.id
      });
      const { error: sourceError } = await supabase.from("opportunity_sources").upsert({
        internship_id: createdInternship.id,
        academic_unit_id: academicUnit.id,
        batch_id: batch.id,
        source_row_number: row.rowNumber
      }, { onConflict: "batch_id,source_row_number" });
      if (sourceError) throw sourceError;
      const { error: eligibleUnitError } = await supabase.from("internship_eligible_units").upsert({
        internship_id: createdInternship.id,
        academic_unit_id: academicUnit.id
      }, { onConflict: "internship_id,academic_unit_id" });
      if (eligibleUnitError) throw eligibleUnitError;
    }

    if (batchRows.length) {
      const { error: rowsError } = await supabase.from("import_batch_rows").insert(batchRows);
      if (rowsError) throw rowsError;
    }
    const { error: completeError } = await supabase.from("import_batches").update({
      status: errors.length ? "completed_with_errors" : "completed",
      imported_rows: imported,
      updated_rows: updated,
      skipped_rows: skipped,
      error_rows: errors.length,
      completed_at: new Date().toISOString()
    }).eq("id", batch.id);
    if (completeError) throw completeError;

    return NextResponse.json({
      imported,
      updated,
      skipped,
      processed: imported + updated + skipped,
      total: rows.length,
      errors,
      batchId: batch.id
    }, { status: 201 });
  } catch (error) {
    if (supabase && batchId) {
      const { error: batchUpdateError } = await supabase.from("import_batches").update({
        status: "failed",
        completed_at: new Date().toISOString()
      }).eq("id", batchId);
      if (batchUpdateError) console.error("Failed to mark import batch as failed", batchUpdateError);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
