import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ logoUrl: "" }, { headers: { "Cache-Control": "no-store" } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ logoUrl: "" }, { headers: { "Cache-Control": "no-store" } });
  const { data, error } = await createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    .from("site_settings").select("value").eq("key", "site_logo_url").maybeSingle();
  if (error) return NextResponse.json({ error: "โหลดการตั้งค่าเว็บไซต์ไม่สำเร็จ", details: error.message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ logoUrl: data?.value ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
