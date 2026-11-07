import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/supabase/auth";
import { getLocationFromGoogleMapsUrl } from "@/lib/google-maps-location";
import { isMissingLocationValue, isUnknownLocationMarked } from "@/lib/location";

export const runtime = "nodejs";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });

  try {
    const supabase = client();
    const { data: company, error: findError } = await supabase
      .from("companies")
      .select("id,name,google_maps_url,address,district,province,latitude,longitude")
      .eq("id", params.id)
      .maybeSingle();
    if (findError) throw findError;
    if (!company) return NextResponse.json({ error: "ไม่พบบริษัท" }, { status: 404 });
    if (!company.google_maps_url?.trim()) {
      return NextResponse.json({ error: "บริษัทนี้ยังไม่มีลิงก์ Google Maps" }, { status: 422 });
    }
    if (isUnknownLocationMarked(company.address)) {
      return NextResponse.json({ status: "marked-unknown", companyId: company.id });
    }

    const missing = company.latitude == null
      || company.longitude == null
      || isMissingLocationValue(company.address)
      || isMissingLocationValue(company.district)
      || isMissingLocationValue(company.province);
    if (!missing) return NextResponse.json({ status: "complete", companyId: company.id });

    const location = await getLocationFromGoogleMapsUrl(company.google_maps_url);
    if (!location) {
      return NextResponse.json({ error: "อ่านพิกัดจากลิงก์ Google Maps นี้ไม่ได้" }, { status: 422 });
    }

    const update: Record<string, string | number> = {};
    if (company.latitude == null) update.latitude = location.latitude;
    if (company.longitude == null) update.longitude = location.longitude;
    if (isMissingLocationValue(company.address) && location.address) update.address = location.address;
    if (isMissingLocationValue(company.district) && location.district) update.district = location.district;
    if (isMissingLocationValue(company.province) && location.province) update.province = location.province;

    if (!Object.keys(update).length) return NextResponse.json({ status: "no-data", companyId: company.id });

    let updateQuery = supabase.from("companies").update({
      ...update,
      updated_at: new Date().toISOString()
    }).eq("id", company.id);
    if ("latitude" in update) updateQuery = company.latitude == null ? updateQuery.is("latitude", null) : updateQuery.eq("latitude", company.latitude);
    if ("longitude" in update) updateQuery = company.longitude == null ? updateQuery.is("longitude", null) : updateQuery.eq("longitude", company.longitude);
    if ("address" in update) updateQuery = company.address == null ? updateQuery.is("address", null) : updateQuery.eq("address", company.address);
    if ("district" in update) updateQuery = company.district == null ? updateQuery.is("district", null) : updateQuery.eq("district", company.district);
    if ("province" in update) updateQuery = company.province == null ? updateQuery.is("province", null) : updateQuery.eq("province", company.province);
    const { data: updatedCompany, error: updateError } = await updateQuery.select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updatedCompany) return NextResponse.json({ status: "changed", companyId: company.id });

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "backfill_company_location_from_google_maps",
      entity_type: "company",
      entity_id: company.id
    });

    return NextResponse.json({
      status: "updated",
      companyId: company.id,
      updatedFields: Object.keys(update)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "เติมข้อมูลตำแหน่งไม่สำเร็จ" }, { status: 500 });
  }
}
