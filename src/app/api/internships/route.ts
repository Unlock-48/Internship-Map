import { NextRequest, NextResponse } from "next/server";
import { searchInternships } from "@/lib/search";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { WorkMode } from "@/types/domain";
import { normalizeOrganizationType } from "@/lib/organization-type";
import { normalizeJobCategory } from "@/lib/job-category";

type SupabaseInternship = {
  id: string;
  company_id: string;
  title: string;
  job_category: string | null;
  description: string;
  qualifications: string | null;
  work_mode: WorkMode;
  allowance_type: "fixed" | "range" | "unpaid" | "negotiable" | "undisclosed";
  allowance_min: number | null;
  allowance_max: number | null;
  allowance_period: "daily" | "monthly" | "hourly" | "weekly";
  openings_count: number | null;
  application_end_date: string | null;
  application_link: string | null;
  status: "open" | "closed" | "expired" | "draft" | "archived";
  all_universities: boolean;
  last_verified_at: string | null;
  companies: {
    id: string;
    name: string;
    slug: string;
    business_type: string | null;
    organization_type: string | null;
    description: string | null;
    address: string;
    district: string;
    province: string;
    latitude: number;
    longitude: number;
    website: string | null;
    facebook: string | null;
    google_maps_url: string | null;
    phone: string | null;
    email: string | null;
    coordinator_name: string | null;
    coordinator_title: string | null;
    coordinator_phone: string | null;
    authorized_name: string | null;
    authorized_title: string | null;
    business_hours: string | null;
    advisor_recommendation: string | null;
    advisor_name: string | null;
    status: "active" | "inactive" | "archived";
    last_verified_at: string | null;
  };
  internship_positions: { positions: { name: string } | null }[];
  internship_universities: { universities: { name: string } | null }[];
};

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase", data: [], count: 0, source: "supabase" }, { status: 503 });
  }

  const url = request.nextUrl;
  const allowedModes: WorkMode[] = ["onsite", "hybrid", "remote", "undisclosed"];
  const requestedModes = url.searchParams.getAll("workMode").filter((mode): mode is WorkMode => allowedModes.includes(mode as WorkMode));
  const supabase = createServerSupabaseClient();
  let query = supabase.from("internships").select("*, companies!inner(*), internship_positions(positions(name)), internship_universities(universities(name))").eq("status", "open").eq("companies.status", "active");
  if (url.searchParams.get("q")) query = query.or(`title.ilike.%${url.searchParams.get("q")!.replace(/[%_]/g, "")}%,description.ilike.%${url.searchParams.get("q")!.replace(/[%_]/g, "")}%`);
  if (requestedModes.length) query = query.in("work_mode", requestedModes);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "ไม่สามารถอ่านข้อมูลจาก Supabase ได้", details: error.message }, { status: 502 });

  const result = (data as SupabaseInternship[]).map((item) => ({
    id: item.id,
    companyId: item.company_id,
    title: item.title,
    jobCategory: normalizeJobCategory(item.job_category),
    description: item.description,
    qualifications: item.qualifications ? item.qualifications.split("\n").filter(Boolean) : [],
    positions: item.internship_positions.flatMap((row) => row.positions ? [row.positions.name] : []),
    universities: item.internship_universities.flatMap((row) => row.universities ? [row.universities.name] : []),
    allUniversities: item.all_universities,
    workMode: item.work_mode,
    allowanceType: item.allowance_type,
    allowanceMin: item.allowance_min ?? undefined,
    allowanceMax: item.allowance_max ?? undefined,
    allowancePeriod: item.allowance_period,
    openingsCount: item.openings_count ?? undefined,
    applicationEndDate: item.application_end_date ?? undefined,
    applicationLink: item.application_link ?? undefined,
    status: item.status,
    lastVerifiedAt: item.last_verified_at ?? "",
    company: {
      id: item.companies.id,
      name: item.companies.name,
      slug: item.companies.slug,
      businessType: item.companies.business_type ?? "",
      organizationType: normalizeOrganizationType(item.companies.organization_type),
      description: item.companies.description ?? "",
      address: item.companies.address,
      district: item.companies.district,
      province: item.companies.province,
      latitude: item.companies.latitude == null ? undefined : Number(item.companies.latitude),
      longitude: item.companies.longitude == null ? undefined : Number(item.companies.longitude),
      website: item.companies.website ?? undefined,
      facebook: item.companies.facebook ?? undefined,
      googleMapsUrl: item.companies.google_maps_url ?? undefined,
      phone: item.companies.phone ?? undefined,
      email: item.companies.email ?? undefined,
      coordinatorName: item.companies.coordinator_name ?? undefined,
      coordinatorTitle: item.companies.coordinator_title ?? undefined,
      coordinatorPhone: item.companies.coordinator_phone ?? undefined,
      authorizedName: item.companies.authorized_name ?? undefined,
      authorizedTitle: item.companies.authorized_title ?? undefined,
      businessHours: item.companies.business_hours ?? undefined,
      advisorRecommendation: item.companies.advisor_recommendation ?? undefined,
      advisorName: item.companies.advisor_name ?? undefined,
      status: item.companies.status,
      lastVerifiedAt: item.companies.last_verified_at ?? ""
    }
  }));
  return NextResponse.json({ data: searchInternships(result, { q: url.searchParams.get("q") ?? undefined, workModes: requestedModes }), count: result.length, source: "supabase" });
}
