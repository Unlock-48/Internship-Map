import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/supabase/auth";
import { inferJobCategory } from "@/lib/job-category";
import { normalizeOrganizationType } from "@/lib/organization-type";
import { resolveGoogleMapsCoordinates } from "@/lib/google-maps";

export const runtime = "nodejs";

type CompanyInput = {
  id?: string;
  internshipId?: string;
  universityId?: string;
  academicUnitId?: string;
  allUniversities?: boolean;
  clearEmptyFields?: boolean;
  companyName?: string;
  businessType?: string;
  organizationType?: string;
  address?: string;
  district?: string;
  province?: string;
  latitude?: string;
  longitude?: string;
  website?: string;
  facebook?: string;
  googleMapsUrl?: string;
  phone?: string;
  email?: string;
  companyDescription?: string;
  coordinatorName?: string;
  coordinatorTitle?: string;
  coordinatorPhone?: string;
  authorizedName?: string;
  authorizedTitle?: string;
  businessHours?: string;
  advisorRecommendation?: string;
  advisorName?: string;
  positionTitle?: string;
  jobDescription?: string;
  jobCategory?: string;
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function slug(value: string) {
  return `${value.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "") || "company"}-${Date.now()}`;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const { data, error } = await client().from("companies")
      .select("id,name,slug,business_type,organization_type,description,address,district,province,latitude,longitude,website,facebook,google_maps_url,phone,email,coordinator_name,coordinator_title,coordinator_phone,authorized_name,authorized_title,business_hours,advisor_recommendation,advisor_name,status,created_at,updated_at,internships(id,title,description,job_category,status,academic_unit_id,all_universities,created_at,updated_at,academic_units!internships_academic_unit_id_fkey(id,university_id,name,universities(id,name)))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const companies = (data ?? []).map((company) => ({
      ...company,
      organization_type: normalizeOrganizationType(company.organization_type)
    }));
    return NextResponse.json({ data: companies });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "โหลดรายชื่อบริษัทไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const body = await request.json() as CompanyInput;
    const companyName = text(body.companyName);
    if (!companyName) return NextResponse.json({ error: "กรุณาระบุชื่อบริษัท" }, { status: 400 });
    const positionTitle = text(body.positionTitle);
    if (!positionTitle) return NextResponse.json({ error: "กรุณาระบุตำแหน่งที่รับ" }, { status: 400 });
    const supabase = client();
    const universityId = text(body.universityId);
    const academicUnitId = text(body.academicUnitId);
    if (!universityId || !academicUnitId) {
      return NextResponse.json({ error: "กรุณาเลือกมหาวิทยาลัยและคณะ/ภาควิชา/สาขา" }, { status: 400 });
    }
    const { data: academicUnit, error: academicUnitError } = await supabase
      .from("academic_units")
      .select("id,university_id")
      .eq("id", academicUnitId)
      .eq("university_id", universityId)
      .eq("is_active", true)
      .maybeSingle();
    if (academicUnitError) throw academicUnitError;
    if (!academicUnit) {
      return NextResponse.json({ error: "หน่วยงานที่เลือกไม่อยู่ในมหาวิทยาลัยนี้ หรือถูกปิดใช้งาน" }, { status: 400 });
    }
    const googleMapsUrl = text(body.googleMapsUrl);
    const linkCoordinates = await resolveGoogleMapsCoordinates(googleMapsUrl);
    const latitude = linkCoordinates?.latitude ?? (text(body.latitude) ? Number(body.latitude) : null);
    const longitude = linkCoordinates?.longitude ?? (text(body.longitude) ? Number(body.longitude) : null);
    const companyData = {
      name: companyName,
      business_type: text(body.businessType) || null,
      organization_type: normalizeOrganizationType(body.organizationType),
      description: text(body.companyDescription) || null,
      address: text(body.address, "ไม่ระบุ"),
      district: text(body.district, "ไม่ระบุ"),
      province: text(body.province, "เชียงใหม่"),
      latitude,
      longitude,
      website: text(body.website) || null,
      facebook: text(body.facebook) || null,
      google_maps_url: googleMapsUrl || null,
      phone: text(body.phone) || null,
      email: text(body.email) || null,
      status: "active" as const,
      coordinator_name: text(body.coordinatorName) || null,
      coordinator_title: text(body.coordinatorTitle) || null,
      coordinator_phone: text(body.coordinatorPhone) || null,
      authorized_name: text(body.authorizedName) || null,
      authorized_title: text(body.authorizedTitle) || null,
      business_hours: text(body.businessHours) || null,
      advisor_recommendation: text(body.advisorRecommendation) || null,
      advisor_name: text(body.advisorName) || null,
      updated_at: new Date().toISOString()
    };
    let companyId = body.id;
    let hasCoordinates = latitude != null && longitude != null;
    if (companyId) {
      const { data: existingCompany, error: existingCompanyError } = await supabase
        .from("companies")
        .select("business_type,description,address,district,province,latitude,longitude,website,facebook,google_maps_url,phone,email,coordinator_name,coordinator_title,coordinator_phone,authorized_name,authorized_title,business_hours,advisor_recommendation,advisor_name,status")
        .eq("id", companyId)
        .maybeSingle();
      if (existingCompanyError) throw existingCompanyError;
      if (!existingCompany) return NextResponse.json({ error: "ไม่พบบริษัทที่ต้องการแก้ไข" }, { status: 404 });
      const updateData = {
        ...(body.clearEmptyFields ? companyData : {
          ...companyData,
          business_type: companyData.business_type ?? existingCompany.business_type,
          description: companyData.description ?? existingCompany.description,
          address: companyData.address || existingCompany.address,
          district: companyData.district || existingCompany.district,
          province: companyData.province || existingCompany.province,
          latitude: companyData.latitude ?? existingCompany.latitude,
          longitude: companyData.longitude ?? existingCompany.longitude,
          website: companyData.website ?? existingCompany.website,
          facebook: companyData.facebook ?? existingCompany.facebook,
          google_maps_url: companyData.google_maps_url ?? existingCompany.google_maps_url,
          phone: companyData.phone ?? existingCompany.phone,
          email: companyData.email ?? existingCompany.email,
          coordinator_name: companyData.coordinator_name ?? existingCompany.coordinator_name,
          coordinator_title: companyData.coordinator_title ?? existingCompany.coordinator_title,
          coordinator_phone: companyData.coordinator_phone ?? existingCompany.coordinator_phone,
          authorized_name: companyData.authorized_name ?? existingCompany.authorized_name,
          authorized_title: companyData.authorized_title ?? existingCompany.authorized_title,
          business_hours: companyData.business_hours ?? existingCompany.business_hours,
          advisor_recommendation: companyData.advisor_recommendation ?? existingCompany.advisor_recommendation,
          advisor_name: companyData.advisor_name ?? existingCompany.advisor_name
        }),
        status: existingCompany.status
      };
      hasCoordinates = updateData.latitude != null && updateData.longitude != null;
      const { error } = await supabase.from("companies").update(updateData).eq("id", companyId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("companies").insert({ ...companyData, slug: slug(companyName), last_verified_at: null }).select("id").single();
      if (error) throw error;
      companyId = data.id;
    }

    if (positionTitle) {
      if (body.id) {
        const { data: existingInternship, error: findInternshipError } = await supabase
          .from("internships")
          .select("id,description,status")
          .eq("company_id", companyId)
          .eq(body.internshipId ? "id" : "company_id", body.internshipId ?? companyId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (findInternshipError) throw findInternshipError;
        if (existingInternship) {
          const { error } = await supabase.from("internships").update({
            title: positionTitle,
            description: body.clearEmptyFields ? text(body.jobDescription) : text(body.jobDescription) || existingInternship.description,
            job_category: text(body.jobCategory) || inferJobCategory(positionTitle, text(body.jobDescription)),
            academic_unit_id: academicUnit.id,
            all_universities: body.allUniversities === true,
            status: existingInternship.status,
            updated_at: new Date().toISOString()
          }).eq("id", existingInternship.id);
          if (error) throw error;
          const { error: clearEligibleUnitsError } = await supabase.from("internship_eligible_units").delete().eq("internship_id", existingInternship.id);
          if (clearEligibleUnitsError) throw clearEligibleUnitsError;
          if (body.allUniversities !== true) {
            const { error: eligibleUnitError } = await supabase.from("internship_eligible_units").upsert({
              internship_id: existingInternship.id,
              academic_unit_id: academicUnit.id
            }, { onConflict: "internship_id,academic_unit_id" });
            if (eligibleUnitError) throw eligibleUnitError;
          }
        } else {
          const { data: createdInternship, error } = await supabase.from("internships").insert({
            company_id: companyId, academic_unit_id: academicUnit.id, title: positionTitle, description: text(body.jobDescription, "ไม่ระบุ"),
            job_category: text(body.jobCategory) || inferJobCategory(positionTitle, text(body.jobDescription)),
            status: "open", work_mode: "undisclosed", allowance_type: "undisclosed",
            all_universities: body.allUniversities === true, last_verified_at: null
          }).select("id").single();
          if (error) throw error;
          if (body.allUniversities !== true) {
            const { error: eligibleUnitError } = await supabase.from("internship_eligible_units").upsert({
              internship_id: createdInternship.id,
              academic_unit_id: academicUnit.id
            }, { onConflict: "internship_id,academic_unit_id" });
            if (eligibleUnitError) throw eligibleUnitError;
          }
        }
      } else {
        const { data: createdInternship, error } = await supabase.from("internships").insert({
          company_id: companyId, academic_unit_id: academicUnit.id, title: positionTitle, description: text(body.jobDescription, "ไม่ระบุ"),
          job_category: text(body.jobCategory) || inferJobCategory(positionTitle, text(body.jobDescription)),
          status: "open", work_mode: "undisclosed", allowance_type: "undisclosed",
          all_universities: body.allUniversities === true, last_verified_at: null
        }).select("id").single();
        if (error) throw error;
        if (body.allUniversities !== true) {
          const { error: eligibleUnitError } = await supabase.from("internship_eligible_units").upsert({
            internship_id: createdInternship.id,
            academic_unit_id: academicUnit.id
          }, { onConflict: "internship_id,academic_unit_id" });
          if (eligibleUnitError) throw eligibleUnitError;
        }
      }
    }
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: body.id ? "update_company" : "create_company", entity_type: "company", entity_id: companyId });
    return NextResponse.json({ ok: true, id: companyId, hasCoordinates }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.get("duplicate-unknown-position") === "true") {
      const body = await request.json() as { internshipIds?: unknown };
      const internshipIds = Array.isArray(body.internshipIds)
        ? body.internshipIds.filter((id): id is string => typeof id === "string" && id.length > 0)
        : [];
      if (!internshipIds.length) return NextResponse.json({ ok: true, deleted: 0 });
      const supabase = client();
      const { data: candidates, error: candidateError } = await supabase
        .from("internships")
        .select("id,title,companies(name)")
        ;
      if (candidateError) throw candidateError;
      const requestedIds = new Set(internshipIds);
      const nameCounts = new Map<string, number>();
      for (const candidate of candidates ?? []) {
        const company = Array.isArray(candidate.companies) ? candidate.companies[0] : candidate.companies;
        const name = typeof company?.name === "string" ? company.name.trim().replace(/\s+/g, " ").toLowerCase() : "";
        if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
      }
      const eligibleIds = (candidates ?? [])
        .filter((candidate) => {
          const company = Array.isArray(candidate.companies) ? candidate.companies[0] : candidate.companies;
          const name = typeof company?.name === "string" ? company.name.trim().replace(/\s+/g, " ").toLowerCase() : "";
          const title = typeof candidate.title === "string" ? candidate.title.trim().replace(/\s+/g, " ").toLowerCase() : "";
          return requestedIds.has(candidate.id)
            && (nameCounts.get(name) ?? 0) > 1
            && (!title || title === "ไม่ระบุตำแหน่ง");
        })
        .map((candidate) => candidate.id);
      if (!eligibleIds.length) return NextResponse.json({ ok: true, deleted: 0 });
      const { error } = await supabase.from("internships").delete().in("id", eligibleIds);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ actor_id: user.id, action: "delete_duplicate_unknown_internships", entity_type: "internship", entity_id: null });
      return NextResponse.json({ ok: true, deleted: eligibleIds.length });
    }
    if (requestUrl.searchParams.get("all") === "true") {
      const { error } = await client().from("companies").delete().not("id", "is", null);
      if (error) throw error;
      await client().from("audit_logs").insert({ actor_id: user.id, action: "clear_all_companies", entity_type: "company", entity_id: null });
      return NextResponse.json({ ok: true });
    }
    const internshipId = requestUrl.searchParams.get("internshipId");
    if (internshipId) {
      const { error } = await client().from("internships").delete().eq("id", internshipId);
      if (error) throw error;
      await client().from("audit_logs").insert({ actor_id: user.id, action: "delete_internship", entity_type: "internship", entity_id: internshipId });
      return NextResponse.json({ ok: true });
    }
    const id = requestUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ไม่พบรหัสบริษัท" }, { status: 400 });
    const { error } = await client().from("companies").delete().eq("id", id);
    if (error) throw error;
    await client().from("audit_logs").insert({ actor_id: user.id, action: "delete_company", entity_type: "company", entity_id: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ลบบริษัทไม่สำเร็จ" }, { status: 500 });
  }
}
