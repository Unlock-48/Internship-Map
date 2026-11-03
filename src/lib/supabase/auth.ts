import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getAdminUser() {
  const cookieStore = cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {}
      }
    }
  );
  const { data: { user } } = await client.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return user && adminEmail && user.email?.toLowerCase() === adminEmail ? user : null;
}
