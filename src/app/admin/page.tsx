"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { jobCategories } from "@/lib/job-category";
import { provinces as allProvinces } from "@/lib/province";
import { getAcademicUnitPath } from "@/lib/academic-units";
import { AcademicStructureManager } from "@/components/admin/academic-structure-manager";

type Company = {
  id: string; name: string; business_type: string | null; organization_type: string; description: string | null; address: string; district: string; province: string; website: string | null;
  facebook: string | null; google_maps_url: string | null; phone: string | null; email: string | null; coordinator_name: string | null; coordinator_title: string | null; coordinator_phone: string | null; latitude: number | null; longitude: number | null;
  authorized_name: string | null; authorized_title: string | null; business_hours: string | null;
  advisor_recommendation: string | null; advisor_name: string | null; status: string; created_at: string; updated_at: string;
  internships: { id: string; title: string; description: string; job_category: string; status: string; academic_unit_id: string | null; all_universities: boolean; academic_units: { id: string; university_id: string; name: string; universities: { id: string; name: string } | null } | null; created_at: string; updated_at: string }[];
};
type University = { id: string; code: string; name: string };
type AcademicUnit = { id: string; university_id: string; parent_id: string | null; code: string; name: string; unit_type: string };
type Report = { id: string; source: "report" | "submission"; type: "เสนอข้อมูล" | "แจ้งข้อมูลผิด"; reference: string; reason: string; details: string; status: "pending" | "reviewed" | "dismissed"; created_at: string };
type Category = { id: string; category_type: "organization_type" | "business_type"; name: string; is_active: boolean };
type FormData = { id?: string; internshipId?: string; universityId: string; academicUnitId: string; allUniversities: boolean; clearEmptyFields: boolean; companyName: string; organizationType: string; businessType: string; companyDescription: string; address: string; district: string; province: string; latitude: string; longitude: string; website: string; facebook: string; googleMapsUrl: string; phone: string; email: string; coordinatorName: string; coordinatorTitle: string; coordinatorPhone: string; authorizedName: string; authorizedTitle: string; businessHours: string; advisorRecommendation: string; advisorName: string; positionTitle: string; jobCategory: string; jobDescription: string };
const emptyForm: FormData = { universityId: "", academicUnitId: "", allUniversities: false, clearEmptyFields: false, companyName: "", organizationType: "ไม่ระบุ", businessType: "", companyDescription: "", address: "", district: "", province: "เชียงใหม่", latitude: "", longitude: "", website: "", facebook: "", googleMapsUrl: "", phone: "", email: "", coordinatorName: "", coordinatorTitle: "", coordinatorPhone: "", authorizedName: "", authorizedTitle: "", businessHours: "", advisorRecommendation: "", advisorName: "", positionTitle: "", jobCategory: "ไม่ระบุ", jobDescription: "" };

export default function AdminPage() {
  const [user, setUser] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [academicUnits, setAcademicUnits] = useState<AcademicUnit[]>([]);
  const [universityFilter, setUniversityFilter] = useState("");
  const [academicUnitFilter, setAcademicUnitFilter] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ categoryType: "organization_type" as Category["category_type"], name: "" });
  const [reports, setReports] = useState<Report[]>([]);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<"all" | "submission" | "report">("all");
  const [showInbox, setShowInbox] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<"all" | "unknown" | "unknownProvince" | "noGoogleMap">("all");
  const [duplicateNameFilter, setDuplicateNameFilter] = useState<"all" | "duplicates">("all");
  const [provinceFilter, setProvinceFilter] = useState("");
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
  const [clearing, setClearing] = useState(false);
  const [deletingDuplicateUnknown, setDeletingDuplicateUnknown] = useState(false);

  function createNewForm(): FormData {
    const university = universities.find((item) => item.code === "CMRU") ?? universities[0];
    const unit = academicUnits.find((item) => item.university_id === university?.id && item.code === "COMSCI")
      ?? academicUnits.find((item) => item.university_id === university?.id);
    return { ...emptyForm, universityId: university?.id ?? "", academicUnitId: unit?.id ?? "" };
  }

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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
    const loadAcademicDirectory = () => fetch("/api/academic-units", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { data?: { universities: University[]; units: AcademicUnit[] }; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "โหลดมหาวิทยาลัยและหน่วยงานไม่สำเร็จ");
        const nextUniversities = payload.data?.universities ?? [];
        const units = payload.data?.units ?? [];
        setUniversities(nextUniversities);
        setAcademicUnits(units.map((unit) => ({ ...unit, name: getAcademicUnitPath(unit.id, units) })));
        const defaultUniversity = nextUniversities.find((university) => university.code === "CMRU") ?? nextUniversities[0];
        const defaultUnit = units.find((unit) => unit.university_id === defaultUniversity?.id && unit.code === "COMSCI")
          ?? units.find((unit) => unit.university_id === defaultUniversity?.id);
        if (defaultUniversity && defaultUnit) {
          setForm((current) => current.id || current.universityId ? current : {
            ...current,
            universityId: defaultUniversity.id,
            academicUnitId: defaultUnit.id
          });
        }
      })
      .catch((reason: Error) => setError(reason.message));
    loadAcademicDirectory();
    window.addEventListener("academic-directory-updated", loadAcademicDirectory);
    return () => window.removeEventListener("academic-directory-updated", loadAcademicDirectory);
  }, []);
  useEffect(() => {
    if (!showForm || form.id || form.universityId || !universities.length || !academicUnits.length) return;
    setForm(createNewForm());
  }, [showForm, form.id, form.universityId, universities, academicUnits]);
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

  function edit(company: Company, internship?: Company["internships"][number]) {
    const selectedInternship = internship ?? company.internships[0];
    const defaultUniversity = universities.find((university) => university.code === "CMRU") ?? universities[0];
    const defaultUnit = academicUnits.find((unit) => unit.university_id === defaultUniversity?.id && unit.code === "COMSCI")
      ?? academicUnits.find((unit) => unit.university_id === defaultUniversity?.id);
    setForm({ ...emptyForm, id: company.id, internshipId: selectedInternship?.id, universityId: selectedInternship?.academic_units?.university_id ?? defaultUnit?.university_id ?? "", academicUnitId: selectedInternship?.academic_unit_id ?? defaultUnit?.id ?? "", allUniversities: selectedInternship?.all_universities ?? false, companyName: company.name, organizationType: company.organization_type || "ไม่ระบุ", businessType: company.business_type ?? "", companyDescription: company.description ?? "", address: company.address ?? "", district: company.district ?? "", province: company.province ?? "เชียงใหม่", latitude: company.latitude?.toString() ?? "", longitude: company.longitude?.toString() ?? "", website: company.website ?? "", facebook: company.facebook ?? "", googleMapsUrl: company.google_maps_url ?? "", phone: company.phone ?? "", email: company.email ?? "", coordinatorName: company.coordinator_name ?? "", coordinatorTitle: company.coordinator_title ?? "", coordinatorPhone: company.coordinator_phone ?? "", authorizedName: company.authorized_name ?? "", authorizedTitle: company.authorized_title ?? "", businessHours: company.business_hours ?? "", advisorRecommendation: company.advisor_recommendation ?? "", advisorName: company.advisor_name ?? "", positionTitle: selectedInternship?.title ?? "", jobCategory: selectedInternship?.job_category ?? "ไม่ระบุ", jobDescription: selectedInternship?.description ?? "" });
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
  async function removeInternship(company: Company, internship: Company["internships"][number]) {
    if (!window.confirm(`ยืนยันลบตำแหน่ง “${internship.title}” ของบริษัท “${company.name}” หรือไม่?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/companies?internshipId=${internship.id}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ลบตำแหน่งไม่สำเร็จ");
      setCompanies((items) => items.map((item) => item.id === company.id ? { ...item, internships: item.internships.filter((job) => job.id !== internship.id) } : item));
      setMessage("ลบตำแหน่งงานเรียบร้อยแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ลบตำแหน่งไม่สำเร็จ"); } finally { setBusy(false); }
  }
  async function clearAllData() {
    if (window.prompt("พิมพ์ ล้างข้อมูล เพื่อยืนยันการลบข้อมูลบริษัทและตำแหน่งงานทั้งหมด") !== "ล้างข้อมูล") return;
    setClearing(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/companies?all=true", { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ล้างข้อมูลไม่สำเร็จ");
      setCompanies([]);
      setMessage("ล้างข้อมูลบริษัทและตำแหน่งงานทั้งหมดเรียบร้อยแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ล้างข้อมูลไม่สำเร็จ"); } finally { setClearing(false); }
  }
  async function removeDuplicateUnknownPositions(ids: string[]) {
    if (!ids.length) return;
    if (!window.confirm(`ยืนยันลบ ${ids.length} รายการที่ชื่อสถานประกอบการซ้ำและไม่ระบุตำแหน่งงานหรือไม่?\n\nรายการที่มีตำแหน่งงานจริงจะไม่ถูกลบ`)) return;
    setDeletingDuplicateUnknown(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/companies?duplicate-unknown-position=true", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipIds: ids })
      });
      const payload = await response.json() as { deleted?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ลบรายการซ้ำไม่สำเร็จ");
      const deletedIds = new Set(ids);
      setCompanies((items) => items.map((company) => ({
        ...company,
        internships: company.internships.filter((internship) => !deletedIds.has(internship.id))
      })));
      setMessage(`ลบรายการซ้ำที่ไม่ระบุตำแหน่งงานแล้ว ${payload.deleted ?? ids.length} รายการ`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ลบรายการซ้ำไม่สำเร็จ"); }
    finally { setDeletingDuplicateUnknown(false); }
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
    event.preventDefault();
    if (!form.universityId || !form.academicUnitId) {
      setError("กรุณาเลือกมหาวิทยาลัยและคณะ/ภาควิชา/สาขาที่ดูแลข้อมูลนี้");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json() as { error?: string; hasCoordinates?: boolean };
      if (!response.ok) throw new Error(payload.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      await load(); setForm(createNewForm()); setShowForm(false);
      if (form.googleMapsUrl && !payload.hasCoordinates) {
        setError("บันทึกข้อมูลแล้ว แต่ยังอ่านพิกัดจากลิงก์ไม่ได้ จึงยังไม่แสดงหมุด กรุณากดดึงพิกัดจาก Google Maps หรือกรอกพิกัดเอง");
      } else {
        setMessage(form.id ? "แก้ไขข้อมูลเรียบร้อยแล้ว" : "เพิ่มบริษัทและที่ฝึกงานเรียบร้อยแล้ว");
      }
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
  async function geocodeGoogleMapsLink() {
    if (!form.googleMapsUrl.trim()) {
      setError("กรุณาวางลิงก์ Google Maps ก่อนดึงพิกัด");
      return;
    }
    setGeocoding(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ googleMapsUrl: form.googleMapsUrl }) });
      const payload = await response.json() as { latitude?: number; longitude?: number; error?: string };
      if (!response.ok || payload.latitude == null || payload.longitude == null) throw new Error(payload.error ?? "อ่านพิกัดจาก Google Maps ไม่สำเร็จ");
      setForm((current) => ({ ...current, latitude: String(payload.latitude), longitude: String(payload.longitude) }));
      setMessage(`อ่านพิกัดจาก Google Maps แล้ว: ${payload.latitude}, ${payload.longitude}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "อ่านพิกัดจาก Google Maps ไม่สำเร็จ"); } finally { setGeocoding(false); }
  }
  const jobs = companies.flatMap((company) => company.internships.map((internship) => ({ company, internship })));
  const companyNameCounts = jobs.reduce((counts, { company }) => {
    const normalizedName = company.name.trim().replace(/\s+/g, " ").toLowerCase();
    if (normalizedName) counts.set(normalizedName, (counts.get(normalizedName) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const academicUnitFilterIds = new Set<string>();
  if (academicUnitFilter) {
    academicUnitFilterIds.add(academicUnitFilter);
    let hasDescendant = true;
    while (hasDescendant) {
      hasDescendant = false;
      for (const unit of academicUnits) {
        if (unit.parent_id && academicUnitFilterIds.has(unit.parent_id) && !academicUnitFilterIds.has(unit.id)) {
          academicUnitFilterIds.add(unit.id);
          hasDescendant = true;
        }
      }
    }
  }
  const filtered = jobs.filter(({ company, internship }) => {
    const matchesQuery = `${company.name} ${internship.title} ${internship.description} ${internship.job_category} ${company.business_type ?? ""} ${company.district}`.toLowerCase().includes(query.toLowerCase());
    const unknownLocation = company.latitude == null || company.longitude == null || !company.address || company.address === "ไม่ระบุ";
    const unknownProvince = !company.province?.trim() || ["ไม่ระบุ", "ไม่ทราบจังหวัด"].includes(company.province.trim());
    const noGoogleMap = !company.google_maps_url?.trim();
    const matchesProvince = !provinceFilter || company.province === provinceFilter;
    const matchesLocation = locationFilter === "all"
      || (locationFilter === "unknown" && unknownLocation)
      || (locationFilter === "unknownProvince" && unknownProvince)
      || (locationFilter === "noGoogleMap" && noGoogleMap);
    const normalizedCompanyName = company.name.trim().replace(/\s+/g, " ").toLowerCase();
    const matchesDuplicateName = duplicateNameFilter === "all"
      || (companyNameCounts.get(normalizedCompanyName) ?? 0) > 1;
    const matchesUniversity = !universityFilter || internship.academic_units?.universities?.id === universityFilter;
    const matchesAcademicUnit = !academicUnitFilter || academicUnitFilterIds.has(internship.academic_unit_id ?? "");
    return matchesQuery && matchesLocation && matchesProvince && matchesDuplicateName && matchesUniversity && matchesAcademicUnit;
  });
  const provinces = allProvinces;
  const duplicateUnknownPositionIds = jobs
    .filter(({ company, internship }) => {
      const normalizedTitle = internship.title.trim().replace(/\s+/g, " ").toLowerCase();
      const normalizedCompanyName = company.name.trim().replace(/\s+/g, " ").toLowerCase();
      return (companyNameCounts.get(normalizedCompanyName) ?? 0) > 1
        && (!normalizedTitle || normalizedTitle === "ไม่ระบุตำแหน่ง");
    })
    .map(({ internship }) => internship.id);

  return <main className="page admin-dashboard">
    <div className="admin-hero"><div><p className="eyebrow">ADMIN CONTROL CENTER</p><h1>จัดการตำแหน่งงาน</h1><p>ดู แก้ไข ลบ และเพิ่มข้อมูลตำแหน่งฝึกงาน</p></div><div className="admin-hero-actions"><button className="button secondary inbox-button" onClick={() => setShowInbox((current) => !current)}>✉ จดหมาย {reports.filter((report) => report.status === "pending").length > 0 && <span className="inbox-badge">{reports.filter((report) => report.status === "pending").length}</span>}</button><button className="button secondary" onClick={() => setShowLogoForm((current) => !current)}>🖼️ เปลี่ยนโลโก้</button><button className="button" onClick={() => { setForm(emptyForm); setShowForm(true); }}>＋ เพิ่มที่ฝึกงาน</button><button className="button danger" disabled={clearing} onClick={clearAllData}>{clearing ? "กำลังล้างข้อมูล..." : "ล้างข้อมูลทั้งหมด"}</button></div></div>
    <AcademicStructureManager />
    {showInbox && <section className="inbox-panel"><div className="section-heading"><div><h2>กล่องจดหมายแจ้งข้อมูล</h2><p>{reports.filter((report) => report.status === "pending").length} เรื่องที่ยังไม่ได้อ่าน</p></div><select className="select inbox-filter" value={inboxFilter} onChange={(event) => setInboxFilter(event.target.value as "all" | "submission" | "report")}><option value="all">ทั้งหมด</option><option value="submission">เสนอข้อมูล</option><option value="report">แจ้งข้อมูลผิด</option></select></div>{reports.length === 0 && <div className="notice">ยังไม่มีข้อความแจ้งข้อมูล</div>}<div className="inbox-list">{reports.filter((report) => inboxFilter === "all" || report.source === inboxFilter).map((report) => <article className={`inbox-item ${report.status === "pending" ? "unread" : ""} ${report.status === "reviewed" ? "completed" : ""} ${report.status === "dismissed" ? "incorrect" : ""}`} key={`${report.source}-${report.id}`}><button className="inbox-summary" type="button" onClick={() => setOpenReportId((current) => current === report.id ? null : report.id)} aria-expanded={openReportId === report.id}><span><strong>{report.reference}</strong><small>{report.type}</small></span><time>{new Date(report.created_at).toLocaleString("th-TH")}</time><b aria-hidden="true">{openReportId === report.id ? "−" : "+"}</b></button>{openReportId === report.id && <div className="inbox-details"><p className="preserve-lines">{report.details}</p><div className="inbox-actions">{report.status === "pending" && <button className="button secondary" onClick={() => updateReport(report, "reviewed")}>เสร็จแล้ว</button>}{report.status === "reviewed" && <span className="inbox-status completed-label">เสร็จแล้ว</span>}{report.status === "dismissed" && <span className="inbox-status incorrect-label">ข้อมูลผิด</span>}{report.status === "pending" && <button className="button secondary incorrect-action" onClick={() => updateReport(report, "dismissed")}>ข้อมูลผิด</button>}</div></div>}</article>)}</div></section>}
    {showLogoForm && <section className="logo-settings"><div><h2>โลโก้เว็บไซต์</h2><p>เลือกไฟล์ภาพเพื่อเปลี่ยนโลโก้ที่แสดงบนหัวเว็บทุกหน้า (ไม่เกิน 2 MB)</p>{logoUrl && <img className="logo-preview" src={logoUrl} alt="โลโก้ปัจจุบัน" />}</div><div className="logo-upload-actions"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setLogoFile(event.target.files?.[0])} /><button className="button" type="button" disabled={!logoFile || logoBusy} onClick={saveLogo}>{logoBusy ? "กำลังอัปโหลด..." : "บันทึกโลโก้"}</button></div></section>}
    <section className={`category-settings ${showCategorySettings ? "category-settings-open" : ""}`}><button className="category-settings-toggle" type="button" onClick={() => setShowCategorySettings((current) => !current)} aria-expanded={showCategorySettings}><span><h2>จัดการหมวดหมู่</h2><p>เพิ่ม แก้ไข หรือลบตัวเลือกประเภทหน่วยงานและประเภทกิจการ</p></span><b aria-hidden="true">{showCategorySettings ? "−" : "+"}</b></button>{showCategorySettings && <div className="category-settings-content"><div className="category-add"><select className="select" value={newCategory.categoryType} onChange={(event) => setNewCategory({ ...newCategory, categoryType: event.target.value as Category["category_type"] })}><option value="organization_type">ประเภทหน่วยงาน</option><option value="business_type">ประเภทกิจการ</option></select><input className="input" placeholder="ชื่อหมวดหมู่ใหม่" value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} /><button className="button" type="button" onClick={addCategory}>เพิ่มหมวดหมู่</button></div><div className="category-filters"><label className="category-search"><span>ค้นหาหมวดหมู่</span><input className="input" placeholder="พิมพ์ชื่อหมวดหมู่..." value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} /></label><label className="category-filter"><span>กรองตามประเภท</span><select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | Category["category_type"])}><option value="all">ทั้งหมด</option><option value="organization_type">ประเภทหน่วยงาน</option><option value="business_type">ประเภทกิจการ</option></select></label></div><div className="category-list">{visibleCategories.map((category) => <div className="category-row" key={category.id}><span className="category-tag">{category.category_type === "organization_type" ? "หน่วยงาน" : "กิจการ"}<b>{category.name}</b></span><div><button className="button secondary" type="button" onClick={() => renameCategory(category)}>แก้ไข</button><button className="button secondary" type="button" onClick={() => removeCategory(category)}>ลบ</button></div></div>)}{visibleCategories.length === 0 && <div className="notice">ไม่พบหมวดหมู่ที่ค้นหา</div>}</div></div>}</section>
    {message && <div className="notice success-notice" role="status">✓ {message}</div>}{error && <div className="notice" role="alert">{error}</div>}
    {showForm && <form className={`manual-form admin-record-form ${form.id ? "admin-edit-form" : ""}`} onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">{form.id ? "EDIT DETAIL" : "MANUAL ENTRY"}</p><h2>{form.id ? "แก้ไขข้อมูลรายละเอียดงาน" : "เพิ่มที่ฝึกงานใหม่"}</h2></div>
        <button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="ปิด">×</button>
      </div>
      {form.id && <label className="edit-empty-fields-toggle"><input type="checkbox" checked={form.clearEmptyFields} onChange={(event) => updateForm("clearEmptyFields", event.target.checked)} /><span><strong>ลบข้อมูลเดิมในช่องที่เว้นว่าง</strong><small>ปกติช่องว่างจะคงข้อมูลเดิมไว้ เปิดตัวเลือกนี้เมื่อต้องการล้างข้อมูล</small></span></label>}

      <section className="manual-form-section">
        <h3>มหาวิทยาลัยและหน่วยงาน</h3>
        <div className="form-grid">
          <label className="field">มหาวิทยาลัย
            <select className="select" value={form.universityId} required onChange={(event) => {
              const universityId = event.target.value;
              const unit = academicUnits.find((item) => item.university_id === universityId && item.code === "COMSCI")
                ?? academicUnits.find((item) => item.university_id === universityId);
              setForm((current) => ({ ...current, universityId, academicUnitId: unit?.id ?? "" }));
            }}>
              <option value="">เลือกมหาวิทยาลัย</option>
              {universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
            </select>
          </label>
          <label className="field">คณะ / ภาควิชา / สาขา
            <select className="select" value={form.academicUnitId} disabled={!form.universityId} required onChange={(event) => updateForm("academicUnitId", event.target.value)}>
              <option value="">เลือกหน่วยงาน</option>
              {academicUnits.filter((unit) => unit.university_id === form.universityId).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </label>
        </div>
        <label className="manual-all-universities"><input type="checkbox" checked={form.allUniversities} onChange={(event) => updateForm("allUniversities", event.target.checked)} /> เปิดรับนักศึกษาจากทุกมหาวิทยาลัย (ยังระบุมหาวิทยาลัย/หน่วยงานเจ้าของข้อมูล)</label>
      </section>

      <section className="manual-form-section">
        <h3>ข้อมูลสถานประกอบการ</h3>
        <div className="form-grid">
          <label className="field">ชื่อสถานประกอบการ / หน่วยงาน *<input className="input" required maxLength={255} value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} /></label>
          <label className="field">ประเภทหน่วยงาน
            <select className="select" value={form.organizationType} onChange={(event) => updateForm("organizationType", event.target.value)}>
              {categories.filter((category) => category.category_type === "organization_type").map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              {form.organizationType && !categories.some((category) => category.category_type === "organization_type" && category.name === form.organizationType) && <option value={form.organizationType}>{form.organizationType}</option>}
            </select>
          </label>
          <label className="field">ประเภทกิจการ
            <select className="select" value={form.businessType} onChange={(event) => updateForm("businessType", event.target.value)}>
              <option value="">ไม่ระบุ</option>
              {categories.filter((category) => category.category_type === "business_type").map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              {form.businessType && !categories.some((category) => category.category_type === "business_type" && category.name === form.businessType) && <option value={form.businessType}>{form.businessType}</option>}
            </select>
          </label>
          <label className="field full">รายละเอียดบริษัท<textarea className="input" rows={3} value={form.companyDescription} onChange={(event) => updateForm("companyDescription", event.target.value)} /></label>
        </div>
      </section>

      <section className="manual-form-section">
        <h3>สถานที่และช่องทางติดต่อ</h3>
        <div className="form-grid">
          <label className="field full">ที่อยู่<input className="input" value={form.address} onChange={(event) => updateForm("address", event.target.value)} /></label>
          <label className="field">อำเภอ / เขต<input className="input" value={form.district} onChange={(event) => updateForm("district", event.target.value)} /></label>
          <label className="field">จังหวัด
            <select className="select" value={form.province} onChange={(event) => updateForm("province", event.target.value)}>
              {!allProvinces.includes(form.province as typeof allProvinces[number]) && <option value={form.province}>{form.province}</option>}
              {allProvinces.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </label>
          <label className="field">ลิงก์ Google Maps<input className="input" type="url" value={form.googleMapsUrl} onChange={(event) => updateForm("googleMapsUrl", event.target.value)} /></label>
          <div className="field manual-geocode"><small>วางลิงก์ Google Maps แล้วดึงพิกัดอัตโนมัติ (รองรับลิงก์แชร์แบบสั้น)</small><button type="button" className="button secondary" disabled={geocoding} onClick={geocodeGoogleMapsLink}>{geocoding ? "กำลังอ่านลิงก์..." : "ดึงพิกัดจาก Google Maps"}</button></div>
          <div className="field manual-geocode"><small>กรอกพิกัดเอง หรือค้นหาจากที่อยู่แล้วตรวจสอบก่อนบันทึก</small><button type="button" className="button secondary" disabled={geocoding} onClick={geocode}>{geocoding ? "กำลังค้นหา..." : "ค้นหาพิกัดจากที่อยู่"}</button></div>
          <label className="field">Latitude<input className="input" type="number" step="any" min="-90" max="90" placeholder="18.7883" value={form.latitude} onChange={(event) => updateForm("latitude", event.target.value)} /></label>
          <label className="field">Longitude<input className="input" type="number" step="any" min="-180" max="180" placeholder="98.9853" value={form.longitude} onChange={(event) => updateForm("longitude", event.target.value)} /></label>
          <label className="field">เว็บไซต์<input className="input" type="url" value={form.website} onChange={(event) => updateForm("website", event.target.value)} /></label>
          <label className="field">Facebook<input className="input" type="url" value={form.facebook} onChange={(event) => updateForm("facebook", event.target.value)} /></label>
          <label className="field">เบอร์โทรศัพท์บริษัท<input className="input" type="tel" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} /></label>
          <label className="field">อีเมลบริษัท<input className="input" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} /></label>
        </div>
      </section>

      <section className="manual-form-section">
        <h3>ผู้ประสานงานและผู้ลงนาม</h3>
        <div className="form-grid">
          <label className="field">ชื่อ-สกุล ผู้ประสานงาน / HR<input className="input" value={form.coordinatorName} onChange={(event) => updateForm("coordinatorName", event.target.value)} /></label>
          <label className="field">ตำแหน่งผู้ประสานงาน<input className="input" value={form.coordinatorTitle} onChange={(event) => updateForm("coordinatorTitle", event.target.value)} /></label>
          <label className="field">เบอร์โทรศัพท์ผู้ประสานงาน<input className="input" type="tel" value={form.coordinatorPhone} onChange={(event) => updateForm("coordinatorPhone", event.target.value)} /></label>
          <label className="field">ชื่อ-สกุล ผู้มีอำนาจลงนาม<input className="input" value={form.authorizedName} onChange={(event) => updateForm("authorizedName", event.target.value)} /></label>
          <label className="field">ตำแหน่งผู้มีอำนาจลงนาม<input className="input" value={form.authorizedTitle} onChange={(event) => updateForm("authorizedTitle", event.target.value)} /></label>
          <label className="field">เวลาทำการ<input className="input" value={form.businessHours} onChange={(event) => updateForm("businessHours", event.target.value)} /></label>
        </div>
      </section>

      <section className="manual-form-section">
        <h3>รายละเอียดการฝึกงาน</h3>
        <div className="form-grid">
          <label className="field">ตำแหน่งที่รับ *<input className="input" required maxLength={255} value={form.positionTitle} onChange={(event) => updateForm("positionTitle", event.target.value)} /></label>
          <label className="field">ลักษณะงาน
            <select className="select" value={form.jobCategory} onChange={(event) => updateForm("jobCategory", event.target.value)}>{jobCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
          </label>
          <label className="field full">รายละเอียดงาน<textarea className="input" rows={5} value={form.jobDescription} onChange={(event) => updateForm("jobDescription", event.target.value)} /></label>
          <label className="field">อาจารย์ผู้ให้คำแนะนำ<input className="input" value={form.advisorName} onChange={(event) => updateForm("advisorName", event.target.value)} /></label>
          <label className="field full">คำแนะนำของอาจารย์นิเทศ<textarea className="input" rows={3} value={form.advisorRecommendation} onChange={(event) => updateForm("advisorRecommendation", event.target.value)} /></label>
        </div>
      </section>

      <div className="form-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>ยกเลิก</button><button className="button" disabled={busy}>{busy ? "กำลังบันทึก..." : form.id ? "บันทึกการแก้ไข" : "เพิ่มที่ฝึกงาน"}</button></div>
    </form>}
    <section className="company-panel">
      <div className="section-heading">
        <div><h2>รายการตำแหน่งงานทั้งหมด</h2><p>{filtered.length} จาก {jobs.length} ตำแหน่งงาน</p></div>
        <div className="admin-list-filters">
          <input className="input company-search" placeholder="ค้นหาบริษัทหรือตำแหน่งงาน..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="select location-filter" aria-label="กรองตามมหาวิทยาลัย" value={universityFilter} onChange={(e) => { setUniversityFilter(e.target.value); setAcademicUnitFilter(""); }}><option value="">ทุกมหาวิทยาลัย</option>{universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}</select>
          <select className="select location-filter" aria-label="กรองตามคณะ ภาควิชา หรือสาขา" value={academicUnitFilter} onChange={(e) => setAcademicUnitFilter(e.target.value)}><option value="">ทุกคณะ/ภาควิชา/สาขา</option>{academicUnits.filter((unit) => !universityFilter || unit.university_id === universityFilter).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
          <select className="select location-filter" aria-label="กรองตามสถานที่" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as "all" | "unknown" | "unknownProvince" | "noGoogleMap")}><option value="all">ทุกสถานที่</option><option value="unknown">ไม่ทราบสถานที่</option><option value="unknownProvince">ไม่ทราบจังหวัด</option><option value="noGoogleMap">ไม่มี Google Map</option></select>
          <select className="select location-filter" aria-label="กรองตามชื่อสถานประกอบการ" value={duplicateNameFilter} onChange={(e) => setDuplicateNameFilter(e.target.value as "all" | "duplicates")}><option value="all">ชื่อทั้งหมด</option><option value="duplicates">ชื่อสถานประกอบการซ้ำ</option></select>
          <select className="select location-filter" aria-label="กรองตามจังหวัด" value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}><option value="">ทุกจังหวัด</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}</select>
          <button className="button danger duplicate-cleanup-button" type="button" disabled={!duplicateUnknownPositionIds.length || deletingDuplicateUnknown} title="ลบตำแหน่งที่ระบุว่าไม่ระบุและซ้ำภายใต้บริษัทชื่อเดียวกัน" aria-label={`ลบตำแหน่งที่ไม่ระบุซ้ำ ${duplicateUnknownPositionIds.length} รายการ`} onClick={() => removeDuplicateUnknownPositions(duplicateUnknownPositionIds)}>{deletingDuplicateUnknown ? "กำลังลบ..." : `ลบงานซ้ำ (${duplicateUnknownPositionIds.length})`}</button>
        </div>
      </div>
      <div className="company-list">{filtered.map(({ company, internship }) => <article className="company-row" key={internship.id}><div className="company-avatar">{company.name.slice(0, 1)}</div><div className="company-info"><h3>{internship.title}</h3><p>{company.name} · {internship.job_category || "ไม่ระบุลักษณะงาน"} · {company.district || "ไม่ระบุพื้นที่"}</p><small>{internship.academic_units?.universities?.name || "ไม่ระบุมหาวิทยาลัย"} · {internship.academic_units?.name || "ไม่ระบุหน่วยงาน"} · สถานประกอบการ: {company.status} · ประกาศ: {internship.status} · แก้ไขล่าสุด {new Date(internship.updated_at).toLocaleString("th-TH")}</small></div><div className="company-actions"><button className="icon-button edit-icon" onClick={() => edit(company, internship)} aria-label={`แก้ไข ${internship.title}`} title="แก้ไข">✎</button><button className="icon-button delete-icon" disabled={busy} onClick={() => removeInternship(company, internship)} aria-label={`ลบ ${internship.title}`} title="ลบตำแหน่งนี้">🗑</button></div></article>)}</div>{!filtered.length && <div className="notice">ไม่พบตำแหน่งงาน</div>}
    </section>
    <div className="admin-links"><Link className="button secondary" href="/admin/import">นำเข้า Excel</Link><form action="/api/admin/logout" method="post"><button className="button secondary">ออกจากระบบ</button></form></div>
  </main>;
}
