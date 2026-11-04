import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importRowSchema } from "@/lib/validation";
import { inferJobCategory } from "@/lib/job-category";
import { inferOrganizationType } from "@/lib/organization-type";
import { extractGoogleMapsCoordinates } from "@/lib/google-maps";

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

function isBlank(value: unknown) {
  return value == null || (typeof value === "string" && !value.trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { rows?: unknown[] };
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสำหรับนำเข้า" }, { status: 400 });
    }
    if (body.rows.length > 1000) return NextResponse.json({ error: "นำเข้าได้ครั้งละไม่เกิน 1,000 แถว" }, { status: 400 });

    const rows = body.rows.map((row) => importRowSchema.parse(row));
    const supabase = getAdminClient();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const companyCache = new Map<string, string>();

    for (const row of rows as ImportRow[]) {
      const companyName = row.companyName || "ไม่ระบุบริษัท";
      const positionTitle = row.positionTitle || "ไม่ระบุตำแหน่ง";
      const { data: byId, error: idError } = row.companyId
        ? await supabase.from("companies").select("*").eq("id", row.companyId).maybeSingle()
        : { data: null, error: null };
      if (idError) throw idError;
      const cachedCompanyId = companyCache.get(duplicateKey(companyName));
      const { data: existingCompanies, error: findError } = cachedCompanyId || byId
        ? { data: [], error: null }
        : await supabase.from("companies").select("*").ilike("name", companyName).limit(20);
      if (findError) throw findError;

      const existing = byId ?? (cachedCompanyId ? { id: cachedCompanyId } : existingCompanies?.find((company) => duplicateKey(company.name) === duplicateKey(companyName) && row.district && company.district === row.district) ?? existingCompanies?.find((company) => duplicateKey(company.name) === duplicateKey(companyName)));
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
          province: row.province || "เชียงใหม่",
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
          status: companyStatus(row.status),
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
          updated++;
        }
      }
      companyCache.set(duplicateKey(companyName), companyId);

      const { data: existingInternships, error: internshipFindError } = await supabase
        .from("internships")
        .select("id,title,description,job_category")
        .eq("company_id", companyId);
      if (internshipFindError) throw internshipFindError;
      const duplicate = positionTitle.trim()
        ? existingInternships?.find((internship) => duplicateKey(internship.title) === duplicateKey(positionTitle))
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
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const { error: internshipError } = await supabase.from("internships").insert({
        company_id: companyId,
        title: positionTitle,
        job_category: inferJobCategory(positionTitle, row.jobDescription),
        description: row.jobDescription || "ไม่ระบุ",
        status: "draft",
        work_mode: "undisclosed",
        allowance_type: "undisclosed",
        all_universities: true,
        last_verified_at: null
      });
      if (internshipError) throw internshipError;
      imported++;
    }

    return NextResponse.json({
      imported,
      updated,
      skipped,
      processed: imported + updated + skipped,
      total: rows.length,
      errors
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
