import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ต้องตั้งค่า Supabase ก่อนจัดการโลโก้");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  const { data, error } = await adminClient().from("site_settings").select("value").eq("key", "site_logo_url").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logoUrl: data?.value ?? "" });
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์รูปภาพ" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์โลโก้ต้องไม่เกิน 2 MB" }, { status: 400 });
    const supabase = adminClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = supabase.storage.from("site-assets").getPublicUrl(path);
    const { error: settingError } = await supabase.from("site_settings").upsert({ key: "site_logo_url", value: publicUrl.publicUrl, updated_at: new Date().toISOString() });
    if (settingError) throw settingError;
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: "update_site_logo", entity_type: "site_settings", metadata: { url: publicUrl.publicUrl } });
    return NextResponse.json({ logoUrl: publicUrl.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "อัปโหลดโลโก้ไม่สำเร็จ" }, { status: 500 });
  }
}
