"use client";
import { FormEvent, useState } from "react";

export default function ReportPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const payload = await response.json() as { message?: string; error?: string; details?: string | { fieldErrors?: Record<string, string[]> } };
    if (!response.ok) {
      const fieldErrors = typeof payload.details === "object" ? Object.values(payload.details.fieldErrors ?? {}).flat() : [];
      setError(fieldErrors[0] ?? payload.error ?? (typeof payload.details === "string" ? payload.details : "ส่งรายงานไม่สำเร็จ"));
      return;
    }
    setSent(true);
    form.reset();
  };
  return <main className="page form-page"><h1>แจ้งข้อมูลผิดพลาด</h1><p>ช่วยแจ้งข้อมูลที่หมดอายุ ปิดกิจการ หรือไม่ถูกต้อง</p>{sent && <div className="notice">รับเรื่องแล้ว ทีมงานจะตรวจสอบข้อมูลต่อไป</div>}{error && <div className="notice" role="alert">{error}</div>}<form className="form-card" onSubmit={submit}><label className="field">ประกาศหรือบริษัทที่ต้องการแจ้ง<input required className="input" name="reference" /></label><label className="field">ประเภทปัญหา<select className="select" name="reason"><option>ประกาศหมดอายุ</option><option>ข้อมูลไม่ถูกต้อง</option><option>บริษัทปิดกิจการ</option><option>ปัญหาอื่นๆ</option></select></label><label className="field">รายละเอียด<textarea required className="input" name="details" rows={5} /></label><button className="button" type="submit">ส่งรายงาน</button></form></main>;
}
