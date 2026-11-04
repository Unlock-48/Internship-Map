import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizeOrganizationType } from "@/lib/organization-type";
import { normalizeJobCategory } from "@/lib/job-category";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/supabase/auth";
import { resolveGoogleMapsCoordinates } from "@/lib/google-maps";

type UpdatePayload = {
  title?: string; jobCategory?: string; description?: string;
  companyName?: string; organizationType?: string; businessType?: string;
  companyDescription?: string; address?: string; district?: string; province?: string;
  latitude?: string; longitude?: string; website?: string; facebook?: string;
  googleMapsUrl?: string; phone?: string; email?: string; coordinatorName?: string;
  coordinatorTitle?: string; coordinatorPhone?: string; authorizedName?: string;
  authorizedTitle?: string; businessHours?: string; advisorRecommendation?: string; advisorName?: string;
};

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase" }, { status: 503 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("internships")
    .select("*, companies!inner(*), internship_positions(positions(name)), internship_universities(universities(name)), academic_units!internships_academic_unit_id_fkey(id,name,universities(id,name))")
    .eq("id", params.id)
    .eq("status", "open")
    .eq("companies.status", "active")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "ไม่สามารถอ่านข้อมูลจาก Supabase ได้", details: error.message }, { status: 502 });
  if (!data) return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });

  const company = data.companies;
  const item = {
    id: data.id,
    companyId: data.company_id,
    title: data.title,
    jobCategory: normalizeJobCategory(data.job_category),
    description: data.description,
    qualifications: data.qualifications ? data.qualifications.split("\n").filter(Boolean) : [],
    positions: data.internship_positions.flatMap((row: { positions: { name: string } | null }) => row.positions ? [row.positions.name] : []),
    universities: data.internship_universities.flatMap((row: { universities: { name: string } | null }) => row.universities ? [row.universities.name] : []),
    allUniversities: data.all_universities,
    universityId: data.academic_units?.universities?.id,
    universityName: data.academic_units?.universities?.name,
    academicUnitId: data.academic_unit_id ?? undefined,
    academicUnitName: data.academic_units?.name,
    workMode: data.work_mode,
    allowanceType: data.allowance_type,
    allowanceMin: data.allowance_min ?? undefined,
    allowanceMax: data.allowance_max ?? undefined,
    allowancePeriod: data.allowance_period,
    openingsCount: data.openings_count ?? undefined,
    applicationEndDate: data.application_end_date ?? undefined,
    applicationLink: data.application_link ?? undefined,
    status: data.status,
    lastVerifiedAt: data.last_verified_at ?? "",
    company: {
      id: company.id, name: company.name, slug: company.slug,
      businessType: company.business_type ?? "", description: company.description ?? "",
      organizationType: normalizeOrganizationType(company.organization_type),
      address: company.address, district: company.district, province: company.province,
      latitude: company.latitude == null ? undefined : Number(company.latitude),
      longitude: company.longitude == null ? undefined : Number(company.longitude),
      website: company.website ?? undefined, googleMapsUrl: company.google_maps_url ?? undefined,
      facebook: company.facebook ?? undefined,
      phone: company.phone ?? undefined, email: company.email ?? undefined,
      coordinatorName: company.coordinator_name ?? undefined, coordinatorTitle: company.coordinator_title ?? undefined,
      coordinatorPhone: company.coordinator_phone ?? undefined, authorizedName: company.authorized_name ?? undefined,
      authorizedTitle: company.authorized_title ?? undefined, businessHours: company.business_hours ?? undefined,
      advisorRecommendation: company.advisor_recommendation ?? undefined, advisorName: company.advisor_name ?? undefined,
      status: company.status, lastVerifiedAt: company.last_verified_at ?? ""
    }

  };
  return NextResponse.json({ data: item, source: "supabase" });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin ก่อนแก้ไขข้อมูล" }, { status: 401 });
  try {
    const body = await request.json() as UpdatePayload;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: internship, error: findError } = await supabase.from("internships").select("id,company_id").eq("id", params.id).maybeSingle();
    if (findError) throw findError;
    if (!internship) return NextResponse.json({ error: "ไม่พบประกาศฝึกงาน" }, { status: 404 });
    const value = (input: unknown, fallback = "") => typeof input === "string" ? input.trim() : fallback;
    const numberOrNull = (input: string | undefined) => input && Number.isFinite(Number(input)) ? Number(input) : null;
    const googleMapsUrl = value(body.googleMapsUrl);
    const linkCoordinates = await resolveGoogleMapsCoordinates(googleMapsUrl);
    const { error: companyError } = await supabase.from("companies").update({
      name: value(body.companyName), organization_type: normalizeOrganizationType(body.organizationType),
      business_type: value(body.businessType) || null, description: value(body.companyDescription) || null,
      address: value(body.address, "ไม่ระบุ"), district: value(body.district, "ไม่ระบุ"),
      province: value(body.province, "เชียงใหม่"), latitude: linkCoordinates?.latitude ?? numberOrNull(body.latitude), longitude: linkCoordinates?.longitude ?? numberOrNull(body.longitude),
      website: value(body.website) || null, facebook: value(body.facebook) || null,
      google_maps_url: googleMapsUrl || null, phone: value(body.phone) || null, email: value(body.email) || null,
      coordinator_name: value(body.coordinatorName) || null, coordinator_title: value(body.coordinatorTitle) || null,
      coordinator_phone: value(body.coordinatorPhone) || null, authorized_name: value(body.authorizedName) || null,
      authorized_title: value(body.authorizedTitle) || null, business_hours: value(body.businessHours) || null,
      advisor_recommendation: value(body.advisorRecommendation) || null, advisor_name: value(body.advisorName) || null,
      updated_at: new Date().toISOString()
    }).eq("id", internship.company_id);
    if (companyError) throw companyError;
    const title = value(body.title);
    if (!title) return NextResponse.json({ error: "กรุณาระบุตำแหน่งงาน" }, { status: 400 });
    const { error: internshipError } = await supabase.from("internships").update({
      title, job_category: normalizeJobCategory(body.jobCategory), description: value(body.description, "ไม่ระบุ"),
      updated_at: new Date().toISOString()
    }).eq("id", params.id);
    if (internshipError) throw internshipError;
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: "update_internship_detail", entity_type: "internship", entity_id: params.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
