import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );
  const { data: { user } } = await client.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin = Boolean(user && adminEmail && user.email?.toLowerCase() === adminEmail);
  const isAdminPath = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const isImportApi = request.nextUrl.pathname.startsWith("/api/admin/import/") || request.nextUrl.pathname.startsWith("/api/admin/moderation") || request.nextUrl.pathname.startsWith("/api/admin/companies") || request.nextUrl.pathname.startsWith("/api/admin/geocode") || request.nextUrl.pathname.startsWith("/api/admin/site-settings") || request.nextUrl.pathname.startsWith("/api/admin/reports");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if ((isAdminPath || isImportApi) && !isAdmin && !isLoginPage) {
    if (isImportApi) return NextResponse.json({ error: "ต้องเข้าสู่ระบบ Admin" }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/import/:path*", "/api/admin/moderation", "/api/admin/companies", "/api/admin/geocode", "/api/admin/site-settings", "/api/admin/reports"]
};
