"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { jobCategories } from "@/lib/job-category";

type Company = {
  id: string; name: string; business_type: string | null; organization_type: string; description: string | null; address: string; district: string; province: string; website: string | null;
  facebook: string | null; google_maps_url: string | null; phone: string | null; email: string | null; coordinator_name: string | null; coordinator_title: string | null; coordinator_phone: string | null; latitude: number | null; longitude: number | null;
  authorized_name: string | null; authorized_title: string | null; business_hours: string | null;
  advisor_recommendation: string | null; advisor_name: string | null; status: string; created_at: string; updated_at: string;
  internships: { id: string; title: string; description: string; job_category: string; status: string; created_at: string; updated_at: string }[];
};
type Report = { id: string; source: "report" | "submission"; type: "เสนอข้อมูล" | "แจ้งข้อมูลผิด"; reference: string; reason: string; details: string; status: "pending" | "reviewed" | "dismissed"; created_at: string };
type Category = { id: string; category_type: "organization_type" | "business_type"; name: string; is_active: boolean };
type FormData = { id?: string; companyName: string; organizationType: string; businessType: string; companyDescription: string; address: string; district: string; province: string; latitude: string; longitude: string; website: string; facebook: string; googleMapsUrl: string; phone: string; email: string; coordinatorName: string; coordinatorTitle: string; coordinatorPhone: string; authorizedName: string; authorizedTitle: string; businessHours: string; advisorRecommendation: string; advisorName: string; positionTitle: string; jobCategory: string; jobDescription: string };
const emptyForm: FormData = { companyName: "", organizationType: "ไม่ระบุ", businessType: "", companyDescription: "", address: "", district: "", province: "เชียงใหม่", latitude: "", longitude: "", website: "", facebook: "", googleMapsUrl: "", phone: "", email: "", coordinatorName: "", coordinatorTitle: "", coordinatorPhone: "", authorizedName: "", authorizedTitle: "", businessHours: "", advisorRecommendation: "", advisorName: "", positionTitle: "", jobCategory: "ไม่ระบุ", jobDescription: "" };

export default function AdminPage() {
  const [user, setUser] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ categoryType: "organization_type" as Category["category_type"], name: "" });
  const [reports, setReports] = useState<Report[]>([]);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<"all" | "submission" | "report">("all");
  const [showInbox, setShowInbox] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<"all" | "unknown" | "noGoogleMap">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showLogoForm, setShowLogoForm] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category["category_type"]>("all");
  const [logoFile, setLogoFile] = useState<File>();
  const [logoUrl, setLogoUrl] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);

  async function loadReports() {
    const response = await fetch("/api/admin/reports", { cache: "no-store" });
    const payload = await response.json() as { data?: Report[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "โหลดกล่องจดหมายไม่สำเร็จ");
    setReports(payload.data ?? []);
  }
  async function loadCategories() {
    const response = await fetch("/api/categories", { cache: "no-store" });
    const payload = await response.json() as { data?: Category[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "โหลดหมวดหมู่ไม่สำเร็จ");
    setCategories(payload.data ?? []);
  }
  async function load() {
    const response = await fetch("/api/admin/companies");
    const payload = await response.json() as { data?: Company[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "โหลดข้อมูลไม่สำเร็จ");
    setCompanies(payload.data ?? []);
  }
  useEffect(() => { load().catch((reason: Error) => setError(reason.message)); }, []);
  useEffect(() => { loadReports().catch((reason: Error) => setError(reason.message)); }, []);
  useEffect(() => { loadCategories().catch((reason: Error) => setError(reason.message)); }, []);
  useEffect(() => {
    fetch("/api/admin/site-settings").then((response) => response.json()).then((payload: { logoUrl?: string }) => setLogoUrl(payload.logoUrl ?? "")).catch(() => undefined);
  }, []);

  async function saveLogo() {
    if (!logoFile) return;
    setLogoBusy(true); setError(""); setMessage("");
    try {
      const body = new FormData();
      body.append("file", logoFile);
      const response = await fetch("/api/admin/site-settings", { method: "POST", body });
      const payload = await response.json() as { logoUrl?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "อัปโหลดโลโก้ไม่สำเร็จ");
      setLogoUrl(payload.logoUrl ?? ""); setLogoFile(undefined); setShowLogoForm(false); setMessage("เปลี่ยนโลโก้เว็บไซต์เรียบร้อยแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "อัปโหลดโลโก้ไม่สำเร็จ"); }
    finally { setLogoBusy(false); }
  }

  function edit(company: Company) {
    const internship = company.internships[0];
    setForm({ ...emptyForm, id: company.id, companyName: company.name, organizationType: company.organization_type || "ไม่ระบุ", businessType: company.business_type ?? "", companyDescription: company.description ?? "", address: company.address ?? "", district: company.district ?? "", province: company.province ?? "เชียงใหม่", latitude: company.latitude?.toString() ?? "", longitude: company.longitude?.toString() ?? "", website: company.website ?? "", facebook: company.facebook ?? "", googleMapsUrl: company.google_maps_url ?? "", phone: company.phone ?? "", email: company.email ?? "", coordinatorName: company.coordinator_name ?? "", coordinatorTitle: company.coordinator_title ?? "", coordinatorPhone: company.coordinator_phone ?? "", authorizedName: company.authorized_name ?? "", authorizedTitle: company.authorized_title ?? "", businessHours: company.business_hours ?? "", advisorRecommendation: company.advisor_recommendation ?? "", advisorName: company.advisor_name ?? "", positionTitle: internship?.title ?? "", jobCategory: internship?.job_category ?? "ไม่ระบุ", jobDescription: internship?.description ?? "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(company: Company) {
    if (!window.confirm(`ยืนยันลบบริษัท “${company.name}” และตำแหน่งฝึกงานทั้งหมดหรือไม่?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/companies?id=${company.id}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ลบข้อมูลไม่สำเร็จ");
      setCompanies((items) => items.filter((item) => item.id !== company.id));
      setMessage("ลบบริษัทเรียบร้อยแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ลบข้อมูลไม่สำเร็จ"); } finally { setBusy(false); }
  }
  async function updateReport(report: Report, status: "reviewed" | "dismissed") {
    setError("");
    try {
      const response = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id, source: report.source, status }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "อัปเดตรายงานไม่สำเร็จ");
      await loadReports();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "อัปเดตรายงานไม่สำเร็จ"); }
  }
  async function addCategory() {
    if (!newCategory.name.trim()) return;
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCategory) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error ?? "เพิ่มหมวดหมู่ไม่สำเร็จ"); return; }
    setNewCategory((current) => ({ ...current, name: "" }));
    await loadCategories();
  }
  async function renameCategory(category: Category) {
    const name = window.prompt("ชื่อหมวดหมู่ใหม่", category.name)?.trim();
    if (!name || name === category.name) return;
    const response = await fetch("/api/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: category.id, name }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error ?? "แก้ไขหมวดหมู่ไม่สำเร็จ"); return; }
    await loadCategories();
  }
  async function removeCategory(category: Category) {
    if (!window.confirm(`ลบหมวดหมู่ “${category.name}” หรือไม่?`)) return;
    const response = await fetch(`/api/categories?id=${category.id}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error ?? "ลบหมวดหมู่ไม่สำเร็จ"); return; }
    await loadCategories();
  }
  const visibleCategories = categories.filter((category) => {
    const matchesType = categoryFilter === "all" || category.category_type === categoryFilter;
    return matchesType && category.name.toLowerCase().includes(categorySearch.trim().toLowerCase());
  });
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      await load(); setForm(emptyForm); setShowForm(false); setMessage(form.id ? "แก้ไขข้อมูลเรียบร้อยแล้ว" : "เพิ่มบริษัทและที่ฝึกงานเรียบร้อยแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "บันทึกข้อมูลไม่สำเร็จ"); } finally { setBusy(false); }
  }
  async function geocode() {
    setGeocoding(true); setError("");
    try {
      const response = await fetch("/api/admin/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: form.address, district: form.district, province: form.province }) });
      const payload = await response.json() as { latitude?: number; longitude?: number; error?: string };
      if (!response.ok || payload.latitude == null || payload.longitude == null) throw new Error(payload.error ?? "ค้นหาพิกัดไม่สำเร็จ");
      setForm((current) => ({ ...current, latitude: String(payload.latitude), longitude: String(payload.longitude) }));
      setMessage("ค้นหาพิกัดสำเร็จ ตรวจสอบตำแหน่งบนแผนที่ก่อนบันทึก");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ค้นหาพิกัดไม่สำเร็จ"); } finally { setGeocoding(false); }
  }
  const filtered = companies.filter((company) => {
    const matchesQuery = `${company.name} ${company.business_type ?? ""} ${company.district}`.toLowerCase().includes(query.toLowerCase());
    const unknownLocation = company.latitude == null || company.longitude == null || !company.address || company.address === "ไม่ระบุ";
    const noGoogleMap = !company.google_maps_url?.trim();
    const matchesLocation = locationFilter === "all"
      || (locationFilter === "unknown" && unknownLocation)
      || (locationFilter === "noGoogleMap" && noGoogleMap);
    return matchesQuery && matchesLocation;
  });

  return <main className="page admin-dashboard">
    <div className="admin-hero"><div><p className="eyebrow">ADMIN CONTROL CENTER</p><h1>จัดการสถานประกอบการ</h1><p>ดู แก้ไข ลบ และเพิ่มข้อมูลที่ฝึกงานด้วยตนเอง</p></div><div className="admin-hero-actions"><button className="button secondary inbox-button" onClick={() => setShowInbox((current) => !current)}>✉ จดหมาย {reports.filter((report) => report.status === "pending").length > 0 && <span className="inbox-badge">{reports.filter((report) => report.status === "pending").length}</span>}</button><button className="button secondary" onClick={() => setShowLogoForm((current) => !current)}>🖼️ เปลี่ยนโลโก้</button><button className="button" onClick={() => { setForm(emptyForm); setShowForm(true); }}>＋ เพิ่มที่ฝึกงาน</button></div></div>
    {showInbox && <section className="inbox-panel"><div className="section-heading"><div><h2>กล่องจดหมายแจ้งข้อมูล</h2><p>{reports.filter((report) => report.status === "pending").length} เรื่องที่ยังไม่ได้อ่าน</p></div><select className="select inbox-filter" value={inboxFilter} onChange={(event) => setInboxFilter(event.target.value as "all" | "submission" | "report")}><option value="all">ทั้งหมด</option><option value="submission">เสนอข้อมูล</option><option value="report">แจ้งข้อมูลผิด</option></select></div>{reports.length === 0 && <div className="notice">ยังไม่มีข้อความแจ้งข้อมูล</div>}<div className="inbox-list">{reports.filter((report) => inboxFilter === "all" || report.source === inboxFilter).map((report) => <article className={`inbox-item ${report.status === "pending" ? "unread" : ""} ${report.status === "reviewed" ? "completed" : ""} ${report.status === "dismissed" ? "incorrect" : ""}`} key={`${report.source}-${report.id}`}><button className="inbox-summary" type="button" onClick={() => setOpenReportId((current) => current === report.id ? null : report.id)} aria-expanded={openReportId === report.id}><span><strong>{report.reference}</strong><small>{report.type}</small></span><time>{new Date(report.created_at).toLocaleString("th-TH")}</time><b aria-hidden="true">{openReportId === report.id ? "−" : "+"}</b></button>{openReportId === report.id && <div className="inbox-details"><p className="preserve-lines">{report.details}</p><div className="inbox-actions">{report.status === "pending" && <button className="button secondary" onClick={() => updateReport(report, "reviewed")}>เสร็จแล้ว</button>}{report.status === "reviewed" && <span className="inbox-status completed-label">เสร็จแล้ว</span>}{report.status === "dismissed" && <span className="inbox-status incorrect-label">ข้อมูลผิด</span>}{report.status === "pending" && <button className="button secondary incorrect-action" onClick={() => updateReport(report, "dismissed")}>ข้อมูลผิด</button>}</div></div>}</article>)}</div></section>}
    {showLogoForm && <section className="logo-settings"><div><h2>โลโก้เว็บไซต์</h2><p>เลือกไฟล์ภาพเพื่อเปลี่ยนโลโก้ที่แสดงบนหัวเว็บทุกหน้า (ไม่เกิน 2 MB)</p>{logoUrl && <img className="logo-preview" src={logoUrl} alt="โลโก้ปัจจุบัน" />}</div><div className="logo-upload-actions"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setLogoFile(event.target.files?.[0])} /><button className="button" type="button" disabled={!logoFile || logoBusy} onClick={saveLogo}>{logoBusy ? "กำลังอัปโหลด..." : "บันทึกโลโก้"}</button></div></section>}
    <section className={`category-settings ${showCategorySettings ? "category-settings-open" : ""}`}><button className="category-settings-toggle" type="button" onClick={() => setShowCategorySettings((current) => !current)} aria-expanded={showCategorySettings}><span><h2>จัดการหมวดหมู่</h2><p>เพิ่ม แก้ไข หรือลบตัวเลือกประเภทหน่วยงานและประเภทกิจการ</p></span><b aria-hidden="true">{showCategorySettings ? "−" : "+"}</b></button>{showCategorySettings && <div className="category-settings-content"><div className="category-add"><select className="select" value={newCategory.categoryType} onChange={(event) => setNewCategory({ ...newCategory, categoryType: event.target.value as Category["category_type"] })}><option value="organization_type">ประเภทหน่วยงาน</option><option value="business_type">ประเภทกิจการ</option></select><input className="input" placeholder="ชื่อหมวดหมู่ใหม่" value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} /><button className="button" type="button" onClick={addCategory}>เพิ่มหมวดหมู่</button></div><div className="category-filters"><label className="category-search"><span>ค้นหาหมวดหมู่</span><input className="input" placeholder="พิมพ์ชื่อหมวดหมู่..." value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} /></label><label className="category-filter"><span>กรองตามประเภท</span><select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | Category["category_type"])}><option value="all">ทั้งหมด</option><option value="organization_type">ประเภทหน่วยงาน</option><option value="business_type">ประเภทกิจการ</option></select></label></div><div className="category-list">{visibleCategories.map((category) => <div className="category-row" key={category.id}><span className="category-tag">{category.category_type === "organization_type" ? "หน่วยงาน" : "กิจการ"}<b>{category.name}</b></span><div><button className="button secondary" type="button" onClick={() => renameCategory(category)}>แก้ไข</button><button className="button secondary" type="button" onClick={() => removeCategory(category)}>ลบ</button></div></div>)}{visibleCategories.length === 0 && <div className="notice">ไม่พบหมวดหมู่ที่ค้นหา</div>}</div></div>}</section>
    {message && <div className="notice success-notice" role="status">✓ {message}</div>}{error && <div className="notice" role="alert">{error}</div>}
    {showForm && <form className={form.id ? "detail-edit-form admin-edit-form" : "manual-form"} onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">{form.id ? "EDIT DETAIL" : "MANUAL ENTRY"}</p><h2>{form.id ? "แก้ไขข้อมูลรายละเอียดงาน" : "เพิ่มที่ฝึกงานใหม่"}</h2></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="ปิด">×</button></div><div className={form.id ? "edit-grid" : "form-grid"}><label className="field">ชื่อบริษัท *<input className="input" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></label>    <label className="field">ประเภทหน่วยงาน<select className="select" value={form.organizationType} onChange={(e) => setForm({ ...form, organizationType: e.target.value })}>{categories.filter((category) => category.category_type === "organization_type").map((category) => <option key={category.id}>{category.name}</option>)}{form.organizationType && !categories.some((category) => category.category_type === "organization_type" && category.name === form.organizationType) && <option>{form.organizationType}</option>}</select></label>                <label className="field">ประเภทกิจการ<select className="select" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}><option value="">ไม่ระบุ</option>{categories.filter((category) => category.category_type === "business_type").map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}{form.businessType && !categories.some((category) => category.category_type === "business_type" && category.name === form.businessType) && <option value={form.businessType}>{form.businessType}</option>}</select></label><label className="field full">รายละเอียดบริษัท<textarea className="input" rows={3} value={form.companyDescription} onChange={(e) => setForm({ ...form, companyDescription: e.target.value })} /></label><label className="field full">ที่อยู่<input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label className="field">อำเภอ/เขต<input className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></label><label className="field">จังหวัด<input className="input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></label><label className="field">Latitude<small>ตัวอย่าง 18.7883</small><input className="input" type="number" step="any" min="-90" max="90" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></label><label className="field">Longitude<small>ตัวอย่าง 98.9853</small><input className="input" type="number" step="any" min="-180" max="180" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></label><div className="field full"><small>ไม่มีพิกัด? ใช้ที่อยู่ค้นหาอัตโนมัติ แล้วตรวจสอบหมุดก่อนบันทึก</small><button type="button" className="button secondary" disabled={geocoding} onClick={geocode}>{geocoding ? "กำลังค้นหา..." : "ค้นหาพิกัดจากที่อยู่"}</button></div>    <label className="field">เว็บไซต์<input className="input" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label><label className="field">Facebook<input className="input" type="url" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} /></label><label className="field">Google Maps<input className="input" type="url" value={form.googleMapsUrl} onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })} /></label><label className="field">ผู้ประสานงาน/HR<input className="input" value={form.coordinatorName} onChange={(e) => setForm({ ...form, coordinatorName: e.target.value })} /></label>    <label className="field">เบอร์โทรศัพท์บริษัท<input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="field">อีเมล<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="field">เบอร์โทรศัพท์ผู้ประสานงาน<input className="input" value={form.coordinatorPhone} onChange={(e) => setForm({ ...form, coordinatorPhone: e.target.value })} /></label><label className="field">ตำแหน่งผู้ประสานงาน<input className="input" value={form.coordinatorTitle} onChange={(e) => setForm({ ...form, coordinatorTitle: e.target.value })} /></label><label className="field">ชื่อผู้มีอำนาจลงนาม<input className="input" value={form.authorizedName} onChange={(e) => setForm({ ...form, authorizedName: e.target.value })} /></label><label className="field">ตำแหน่งผู้มีอำนาจลงนาม<input className="input" value={form.authorizedTitle} onChange={(e) => setForm({ ...form, authorizedTitle: e.target.value })} /></label><label className="field">เวลาทำการ<input className="input" value={form.businessHours} onChange={(e) => setForm({ ...form, businessHours: e.target.value })} /></label><label className="field">ชื่ออาจารย์ผู้ให้คำแนะนำ<input className="input" value={form.advisorName} onChange={(e) => setForm({ ...form, advisorName: e.target.value })} /></label><label className="field full">คำแนะนำของอาจารย์นิเทศ<textarea className="input" rows={3} value={form.advisorRecommendation} onChange={(e) => setForm({ ...form, advisorRecommendation: e.target.value })} /></label><label className="field">ตำแหน่งงาน<input className="input" required value={form.positionTitle} onChange={(e) => setForm({ ...form, positionTitle: e.target.value })} /></label>    <label className="field">ลักษณะงาน<select className="select" value={form.jobCategory} onChange={(e) => setForm({ ...form, jobCategory: e.target.value })}>{jobCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field full">รายละเอียดงาน<textarea className="input" rows={6} value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} /></label></div><div className="form-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>ยกเลิก</button><button className="button" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button></div></form>}
    <section className="company-panel"><div className="section-heading"><div><h2>รายชื่อบริษัททั้งหมด</h2><p>{filtered.length} จาก {companies.length} บริษัท</p></div><div className="admin-list-filters"><input className="input company-search" placeholder="ค้นหาบริษัท..." value={query} onChange={(e) => setQuery(e.target.value)} /><select className="select location-filter" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as "all" | "unknown" | "noGoogleMap")}><option value="all">ทุกสถานที่</option><option value="unknown">ไม่ทราบสถานที่</option><option value="noGoogleMap">No Google Map</option></select></div></div><div className="company-list">{filtered.map((company) => <article className="company-row" key={company.id}><div className="company-avatar">{company.name.slice(0, 1)}</div><div className="company-info"><h3>{company.name}</h3><p>{company.business_type || "ไม่ระบุประเภทกิจการ"} · {company.district || "ไม่ระบุพื้นที่"}</p><small>{company.internships.length} ตำแหน่ง · สถานะ {company.status} · แก้ไขล่าสุด {new Date(company.updated_at).toLocaleString("th-TH")}</small></div><div className="company-actions"><button className="icon-button edit-icon" onClick={() => edit(company)} aria-label={`แก้ไข ${company.name}`} title="แก้ไข">✎</button><button className="icon-button delete-icon" disabled={busy} onClick={() => remove(company)} aria-label={`ลบ ${company.name}`} title="ลบ">🗑</button></div></article>)}</div>{!filtered.length && <div className="notice">ไม่พบข้อมูลบริษัท</div>}</section>
    <div className="admin-links"><Link className="button secondary" href="/admin/import">นำเข้า Excel</Link><Link className="button secondary" href="/admin/moderation">ตรวจสอบและเผยแพร่</Link><form action="/api/admin/logout" method="post"><button className="button secondary">ออกจากระบบ</button></form></div>
  </main>;
}
