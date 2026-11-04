"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { InternshipResult } from "@/types/domain";
import { jobCategories } from "@/lib/job-category";

const valueOrUnknown = (value?: string) => value || "ไม่ระบุ";
function formatDetailText(value?: string) {
  if (!value) return "ไม่ระบุ";
  const normalized = value.replace(/\r\n?/g, "\n");
  return normalized.includes("\n") ? normalized : normalized.replace(/\s+\*\s+/g, "\n• ");
}
function getWebsiteEntries(value?: string) {
  return (value ?? "").split(/\r?\n/).map((label) => {
    const text = label.trim();
    if (!text) return undefined;
    try {
      const url = new URL(text);
      return url.protocol === "https:" || url.protocol === "http:" ? { label: text, href: url.href } : { label: text };
    } catch {
      return { label: text };
    }
  }).filter((entry): entry is { label: string; href?: string } => Boolean(entry));
}
type EditForm = Record<string, string>;
type Category = { id: string; category_type: "organization_type" | "business_type"; name: string };

export default function InternshipDetail({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<InternshipResult>();
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<EditForm>({});
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch(`/api/internships/${params.id}`)
      .then(async (response) => {
        const payload = await response.json() as { data?: InternshipResult; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "ไม่สามารถโหลดข้อมูลได้");
        setItem(payload.data);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [params.id]);
  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" }).then((response) => response.json()).then((payload: { data?: Category[] }) => setCategories(payload.data ?? [])).catch(() => undefined);
  }, []);
  useEffect(() => {
    fetch("/api/admin/session").then((response) => response.json()).then((payload: { authenticated?: boolean }) => setIsAdmin(Boolean(payload.authenticated))).catch(() => setIsAdmin(false));
  }, []);

  function startEditing() {
    if (!item) return;
    setForm({
      title: item.title, jobCategory: item.jobCategory, description: item.description,
      companyName: item.company.name, organizationType: item.company.organizationType, businessType: item.company.businessType,
      companyDescription: item.company.description, address: item.company.address, district: item.company.district,
      province: item.company.province, latitude: String(item.company.latitude ?? ""), longitude: String(item.company.longitude ?? ""),
      website: item.company.website ?? "", facebook: item.company.facebook ?? "", googleMapsUrl: item.company.googleMapsUrl ?? "",
      phone: item.company.phone ?? "", email: item.company.email ?? "", coordinatorName: item.company.coordinatorName ?? "",
      coordinatorTitle: item.company.coordinatorTitle ?? "", coordinatorPhone: item.company.coordinatorPhone ?? "",
      authorizedName: item.company.authorizedName ?? "", authorizedTitle: item.company.authorizedTitle ?? "",
      businessHours: item.company.businessHours ?? "", advisorRecommendation: item.company.advisorRecommendation ?? "",
      advisorName: item.company.advisorName ?? ""
    });
    setMessage("");
    setEditing(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/internships/${params.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      const refreshed = await fetch(`/api/internships/${params.id}`);
      const refreshedPayload = await refreshed.json() as { data?: InternshipResult; error?: string };
      if (!refreshed.ok || !refreshedPayload.data) throw new Error(refreshedPayload.error ?? "โหลดข้อมูลหลังบันทึกไม่สำเร็จ");
      setItem(refreshedPayload.data); setEditing(false); setMessage("อัปเดตข้อมูลเรียบร้อยแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "บันทึกข้อมูลไม่สำเร็จ"); }
    finally { setSaving(false); }
  }
  const updateField = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

  if (!item) return <main className="page"><div className="notice">{error || "ไม่พบประกาศฝึกงาน"}</div><Link href="/">← กลับไปหน้าค้นหา</Link></main>;
  const { company } = item;
  const websiteEntries = getWebsiteEntries(company.website);
  return <main className="page detail-page">
    <Link href="/">← กลับไปหน้าค้นหา</Link>
    <div className="detail-card">
      {message && <div className="notice success-notice" role="status">✓ {message}</div>}
      {error && <div className="notice" role="alert">{error}</div>}
      <div className="detail-heading"><span className="badge">{item.workMode}</span><h1>{item.title}</h1><h2>{company.name}</h2><p><strong>มหาวิทยาลัย/หน่วยงาน:</strong> {item.universityName || "ไม่ระบุ"} · {item.academicUnitName || "ไม่ระบุ"}</p><p><strong>ประเภทกิจการ:</strong> {valueOrUnknown(company.businessType)}</p><p><strong>ตำแหน่งที่รับ:</strong> {item.positions.length ? item.positions.join(", ") : item.title}</p>{isAdmin && !editing && <button className="button detail-edit-button" type="button" onClick={startEditing}>แก้ไขข้อมูล</button>}</div>
      {editing && <form className="detail-edit-form" onSubmit={save}>
        <h2>แก้ไขข้อมูลรายละเอียดงาน</h2>
        <div className="edit-grid">
          <label className="field full">ตำแหน่งงาน<input className="input" required value={form.title ?? ""} onChange={(e) => updateField("title", e.target.value)} /></label>
          <label className="field">ลักษณะงาน<select className="select" value={form.jobCategory ?? "ไม่ระบุ"} onChange={(e) => updateField("jobCategory", e.target.value)}>{jobCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="field">ชื่อบริษัท<input className="input" required value={form.companyName ?? ""} onChange={(e) => updateField("companyName", e.target.value)} /></label>
          <label className="field">ประเภทหน่วยงาน<select className="select" value={form.organizationType ?? ""} onChange={(e) => updateField("organizationType", e.target.value)}>{categories.filter((category) => category.category_type === "organization_type").map((category) => <option key={category.id}>{category.name}</option>)}{form.organizationType && !categories.some((category) => category.category_type === "organization_type" && category.name === form.organizationType) && <option>{form.organizationType}</option>}</select></label>
          <label className="field">ประเภทกิจการ<select className="select" value={form.businessType ?? ""} onChange={(e) => updateField("businessType", e.target.value)}><option value="">ไม่ระบุ</option>{categories.filter((category) => category.category_type === "business_type").map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}{form.businessType && !categories.some((category) => category.category_type === "business_type" && category.name === form.businessType) && <option value={form.businessType}>{form.businessType}</option>}</select></label>
          <label className="field full">รายละเอียดงาน<textarea className="input" rows={6} value={form.description ?? ""} onChange={(e) => updateField("description", e.target.value)} /></label>
          <label className="field full">รายละเอียดบริษัท<textarea className="input" rows={3} value={form.companyDescription ?? ""} onChange={(e) => updateField("companyDescription", e.target.value)} /></label>
          <label className="field full">ที่อยู่<input className="input" value={form.address ?? ""} onChange={(e) => updateField("address", e.target.value)} /></label>
          <label className="field">อำเภอ/เขต<input className="input" value={form.district ?? ""} onChange={(e) => updateField("district", e.target.value)} /></label>
          <label className="field">จังหวัด<input className="input" value={form.province ?? ""} onChange={(e) => updateField("province", e.target.value)} /></label>
          <label className="field">Latitude<input className="input" value={form.latitude ?? ""} onChange={(e) => updateField("latitude", e.target.value)} /></label>
          <label className="field">Longitude<input className="input" value={form.longitude ?? ""} onChange={(e) => updateField("longitude", e.target.value)} /></label>
          <label className="field">เว็บไซต์<textarea className="input" rows={2} value={form.website ?? ""} onChange={(e) => updateField("website", e.target.value)} /></label>
          <label className="field">Facebook<input className="input" value={form.facebook ?? ""} onChange={(e) => updateField("facebook", e.target.value)} /></label>
          <label className="field">Google Maps<input className="input" value={form.googleMapsUrl ?? ""} onChange={(e) => updateField("googleMapsUrl", e.target.value)} /></label>
          <label className="field">โทรศัพท์บริษัท<input className="input" value={form.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} /></label>
          <label className="field">อีเมล<input className="input" value={form.email ?? ""} onChange={(e) => updateField("email", e.target.value)} /></label>
          <label className="field">ชื่อผู้ประสานงาน<input className="input" value={form.coordinatorName ?? ""} onChange={(e) => updateField("coordinatorName", e.target.value)} /></label>
          <label className="field">ตำแหน่งผู้ประสานงาน<input className="input" value={form.coordinatorTitle ?? ""} onChange={(e) => updateField("coordinatorTitle", e.target.value)} /></label>
          <label className="field">เบอร์ผู้ประสานงาน<input className="input" value={form.coordinatorPhone ?? ""} onChange={(e) => updateField("coordinatorPhone", e.target.value)} /></label>
          <label className="field">ชื่อผู้มีอำนาจลงนาม<input className="input" value={form.authorizedName ?? ""} onChange={(e) => updateField("authorizedName", e.target.value)} /></label>
          <label className="field">ตำแหน่งผู้มีอำนาจลงนาม<input className="input" value={form.authorizedTitle ?? ""} onChange={(e) => updateField("authorizedTitle", e.target.value)} /></label>
          <label className="field">เวลาทำการ<input className="input" value={form.businessHours ?? ""} onChange={(e) => updateField("businessHours", e.target.value)} /></label>
          <label className="field">ชื่ออาจารย์<input className="input" value={form.advisorName ?? ""} onChange={(e) => updateField("advisorName", e.target.value)} /></label>
          <label className="field full">คำแนะนำอาจารย์<textarea className="input" rows={3} value={form.advisorRecommendation ?? ""} onChange={(e) => updateField("advisorRecommendation", e.target.value)} /></label>
        </div>
        <div className="form-actions"><button className="button secondary" type="button" onClick={() => setEditing(false)}>ยกเลิก</button><button className="button" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button></div>
      </form>}
      <section className="detail-section"><h3>รายละเอียดงาน</h3><p className="preserve-lines">{formatDetailText(item.description)}</p></section>
      <section className="detail-section"><h3>ข้อมูลบริษัทและสถานที่</h3><p><strong>ประเภทหน่วยงาน:</strong> {valueOrUnknown(company.organizationType)}</p><p><strong>รายละเอียดบริษัท:</strong></p><p className="preserve-lines">{formatDetailText(company.description)}</p><p><strong>ที่อยู่:</strong> {company.address} ({company.district}, {company.province})</p><p><strong>พิกัด:</strong> {company.latitude !== undefined && company.longitude !== undefined ? `${company.latitude}, ${company.longitude}` : "ไม่ระบุ"}</p><p><strong>เว็บไซต์:</strong> {websiteEntries.length ? websiteEntries.map((entry, index) => <span key={`${entry.label}-${index}`}>{entry.href ? <a className="detail-link" href={entry.href} target="_blank" rel="noreferrer">{entry.label}</a> : entry.label}{index < websiteEntries.length - 1 ? " · " : ""}</span>) : "ไม่ระบุ"}</p><p><strong>Facebook:</strong> {company.facebook ? <a className="detail-link" href={company.facebook} target="_blank" rel="noreferrer">{company.facebook}</a> : "ไม่ระบุ"}</p><p><strong>Google Maps:</strong> {company.googleMapsUrl ? <a className="detail-link" href={company.googleMapsUrl} target="_blank" rel="noreferrer">เปิดแผนที่</a> : "ยังไม่มีลิงก์แผนที่"}</p></section>
      <section className="detail-section"><h3>ผู้ประสานงาน / HR</h3><p><strong>ชื่อ-สกุล:</strong> {valueOrUnknown(company.coordinatorName)}</p><p><strong>ตำแหน่ง:</strong> {valueOrUnknown(company.coordinatorTitle)}</p><p><strong>เบอร์โทรศัพท์:</strong> {valueOrUnknown(company.coordinatorPhone || company.phone)}</p><p><strong>โทรศัพท์บริษัท:</strong> {valueOrUnknown(company.phone)}</p><p><strong>อีเมล:</strong> {valueOrUnknown(company.email)}</p></section>
      <section className="detail-section"><h3>ผู้มีอำนาจลงนาม</h3><p><strong>ชื่อ-สกุล:</strong> {valueOrUnknown(company.authorizedName)}</p><p><strong>ตำแหน่ง:</strong> {valueOrUnknown(company.authorizedTitle)}</p></section>
      <section className="detail-section"><h3>เวลาทำการ</h3><p>{valueOrUnknown(company.businessHours)}</p></section>
      <section className="detail-section"><h3>คำแนะนำของอาจารย์นิเทศ</h3><p className="preserve-lines">{formatDetailText(company.advisorRecommendation)}</p><p><strong>อาจารย์ผู้ให้คำแนะนำ:</strong> {valueOrUnknown(company.advisorName)}</p></section>
      <section className="detail-section"><h3>ข้อมูลการฝึกงาน</h3><p><strong>เบี้ยเลี้ยง:</strong> {item.allowanceType === "undisclosed" ? "ไม่เปิดเผย" : item.allowanceType === "negotiable" ? "ตามตกลง" : `${item.allowanceMin?.toLocaleString()} บาท/${item.allowancePeriod === "monthly" ? "เดือน" : "วัน"}`}</p><p><strong>ตรวจสอบข้อมูลล่าสุด:</strong> {item.lastVerifiedAt || "ไม่ระบุ"}</p></section>
      <Link className="button" href="/report">แจ้งข้อมูลผิด</Link>
    </div>
  </main>;
}
