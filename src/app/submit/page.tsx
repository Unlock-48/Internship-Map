"use client";
import { FormEvent, useState } from "react";

export default function SubmitPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const payload = await response.json() as { message?: string; error?: string; details?: string | { fieldErrors?: Record<string, string[]> } };
    if (!response.ok) {
      const fieldErrors = typeof payload.details === "object" ? Object.values(payload.details.fieldErrors ?? {}).flat() : [];
      setError(fieldErrors[0] ?? payload.error ?? (typeof payload.details === "string" ? payload.details : "ส่งข้อมูลไม่สำเร็จ"));
      return;
    }
    setSent(true);
    form.reset();
  };
  return <main className="page form-page"><h1>เสนอข้อมูลฝึกงาน</h1><p>ข้อมูลจะเข้าสู่คิวตรวจสอบของ Admin ก่อนเผยแพร่</p>{sent && <div className="notice">ส่งข้อมูลเรียบร้อยแล้ว ขอบคุณที่ช่วยเพิ่มข้อมูลให้ชุมชน</div>}{error && <div className="notice" role="alert">{error}</div>}<form className="form-card" onSubmit={submit}><div className="form-grid"><label className="field">ชื่อบริษัท<input required className="input" name="companyName" /></label><label className="field">ชื่อตำแหน่ง<input required className="input" name="title" /></label><label className="field">รูปแบบงาน<select className="select" name="workMode" defaultValue="onsite"><option value="onsite">Onsite</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></label><label className="field">ลิงก์แหล่งข้อมูล<input type="url" className="input" name="sourceUrl" /></label><label className="field full">รายละเอียด<textarea required className="input" name="description" rows={5} /></label><label className="field full">อีเมลสำหรับติดต่อกลับ (ไม่บังคับ)<input type="email" className="input" name="email" /></label></div><button className="button" type="submit">ส่งให้ตรวจสอบ</button></form></main>;
}
