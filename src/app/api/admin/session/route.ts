import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/auth";

export async function GET() {
  const user = await getAdminUser();
  return NextResponse.json({ authenticated: Boolean(user), email: user?.email ?? null });
}
