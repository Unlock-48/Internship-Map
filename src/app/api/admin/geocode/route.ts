import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const body = await request.json() as { address?: string; district?: string; province?: string };
    const parts = [body.address, body.district, body.province, "ประเทศไทย"].filter((value) => value?.trim());
    if (!parts.length) return NextResponse.json({ error: "กรุณาระบุที่อยู่ก่อนค้นหาพิกัด" }, { status: 400 });
    const search = encodeURIComponent(parts.join(", "));
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=th&q=${search}`, {
      headers: { "User-Agent": "Chiang-Mai-Internship-Map/1.0" },
      next: { revalidate: 0 }
    });
    if (!response.ok) throw new Error("บริการค้นหาพิกัดไม่พร้อมใช้งาน");
    const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
    const result = results[0];
    if (!result) return NextResponse.json({ error: "ไม่พบพิกัดจากที่อยู่นี้ กรุณากรอก Latitude/Longitude เอง" }, { status: 404 });
    return NextResponse.json({ latitude: Number(result.lat), longitude: Number(result.lon), displayName: result.display_name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ค้นหาพิกัดไม่สำเร็จ" }, { status: 502 });
  }
}
