"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.replace("/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return <main className="page auth-page"><form className="form-card auth-card" onSubmit={submit}><h1>เข้าสู่ระบบ Admin</h1><p>ใช้บัญชีผู้ดูแลที่สร้างไว้ใน Supabase Auth</p>{error && <div className="notice" role="alert">{error}</div>}<label className="field">อีเมล<input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field">รหัสผ่าน<input className="input" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="button" disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button></form></main>;
}
