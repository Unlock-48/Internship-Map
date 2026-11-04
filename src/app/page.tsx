"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { searchInternships, UNKNOWN_PROVINCE_FILTER } from "@/lib/search";
import { InternshipResult } from "@/types/domain";
import { jobCategories } from "@/lib/job-category";
import { getAcademicUnitPath } from "@/lib/academic-units";
import { organizationTypes } from "@/lib/organization-type";
import { provinces as allProvinces } from "@/lib/province";
import { provinceCoordinates } from "@/lib/province-coordinates";

const MapView = dynamic(() => import("@/components/map-view").then((module) => module.MapView), { ssr: false });
const allowanceLabel = (item: InternshipResult) => {
  if (item.allowanceType === "unpaid") return "ไม่มีเบี้ยเลี้ยง";
  if (item.allowanceType === "undisclosed") return "ไม่เปิดเผยเบี้ยเลี้ยง";
  if (item.allowanceType === "negotiable") return "เบี้ยเลี้ยงตามตกลง";
  return `${item.allowanceMin?.toLocaleString()} บาท/${item.allowancePeriod === "monthly" ? "เดือน" : "วัน"}`;
};
type University = { id: string; code: string; name: string; short_name: string | null };
type AcademicUnit = { id: string; university_id: string; parent_id: string | null; code: string; name: string; unit_type: string };

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [organizationTypesSelected, setOrganizationTypesSelected] = useState<string[]>([]);
  const [jobCategoriesSelected, setJobCategoriesSelected] = useState<string[]>([]);
  const [provincesSelected, setProvincesSelected] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>();
  const [detailItemId, setDetailItemId] = useState<string>();
  const [items, setItems] = useState<InternshipResult[]>([]);
  const [loadError, setLoadError] = useState("");
  const [mapProvince, setMapProvince] = useState("เชียงใหม่");
  const [universities, setUniversities] = useState<University[]>([]);
  const [academicUnits, setAcademicUnits] = useState<AcademicUnit[]>([]);
  const [universityFilter, setUniversityFilter] = useState("");
  const [academicUnitFilter, setAcademicUnitFilter] = useState("");
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/academic-units")
      .then(async (response) => {
        const payload = await response.json() as { data?: { universities: University[]; units: AcademicUnit[] }; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "โหลดรายชื่อมหาวิทยาลัยไม่สำเร็จ");
        if (active && payload.data) {
          setUniversities(payload.data.universities);
          setAcademicUnits(payload.data.units);
        }
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (universityFilter) params.set("universityId", universityFilter);
    if (academicUnitFilter) params.set("academicUnitId", academicUnitFilter);
    const queryString = params.toString();
    const suffix = queryString ? `?${queryString}` : "";
    fetch(`/api/internships${suffix}`)
      .then(async (response) => {
        const payload = await response.json() as { data?: InternshipResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "ไม่สามารถโหลดข้อมูลได้");
        if (active && payload.data) {
          setItems(payload.data);
          setLoadError("");
        }
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      });
    return () => { active = false; };
  }, [universityFilter, academicUnitFilter]);
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )internship-map-province=([^;]*)/);
    const saved = match ? decodeURIComponent(match[1]) : "";
    if (saved === UNKNOWN_PROVINCE_FILTER) {
      setProvincesSelected([saved]);
    } else if (saved && provinceCoordinates[saved]) {
      setMapProvince(saved);
      setProvincesSelected([saved]);
    }
  }, []);
  function changeProvince(value: string) {
    setProvincesSelected(value ? [value] : []);
    const province = value && value !== UNKNOWN_PROVINCE_FILTER ? value : "เชียงใหม่";
    setMapProvince(province);
    const savedFilter = value || province;
    document.cookie = `internship-map-province=${encodeURIComponent(savedFilter)}; max-age=3600; path=/; SameSite=Lax`;
  }
  const provinces = allProvinces;
  const results = useMemo(() => searchInternships(items, { q: query, organizationTypes: organizationTypesSelected, jobCategories: jobCategoriesSelected, provinces: provincesSelected }), [items, query, organizationTypesSelected, jobCategoriesSelected, provincesSelected]);
  const detailItem = items.find((item) => item.id === detailItemId);
  const visibleCompanies = useMemo(() => {
    const seen = new Set<string>();
    return results
      .filter((item) => !seen.has(item.company.id))
      .map((item) => { seen.add(item.company.id); return item.company; });
  }, [results]);
  const toggleOrganizationType = (type: string) => setOrganizationTypesSelected((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);
  useEffect(() => {
    if (!selected) return;
    const card = resultsScrollRef.current?.querySelector<HTMLElement>(`[data-company-id="${selected}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected, results]);
  useEffect(() => {
    if (!detailItemId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailItemId(undefined);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailItemId]);

  function openDetail(event: MouseEvent<HTMLAnchorElement>, item: InternshipResult) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !window.matchMedia("(min-width: 900px)").matches) return;
    event.preventDefault();
    setSelected(item.companyId);
    setDetailItemId(item.id);
  }

  return (
    <div className="home-shell">
      <main className="workspace">
        <section className="panel">
          <div className="panel-header">
            <div className="search"><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาบริษัท ตำแหน่ง หรือพื้นที่..." aria-label="ค้นหาฝึกงาน" /><button className="button secondary" onClick={() => { setQuery(""); setOrganizationTypesSelected([]); setJobCategoriesSelected([]); setUniversityFilter(""); setAcademicUnitFilter(""); changeProvince(""); }}>ล้าง</button></div>
            <details className="filter-disclosure education-disclosure">
              <summary>
                มหาวิทยาลัย / หน่วยงาน
                <span>{universityFilter ? universities.find((university) => university.id === universityFilter)?.name ?? "มหาวิทยาลัยที่เลือก" : "ทุกมหาวิทยาลัย"} · {academicUnitFilter ? getAcademicUnitPath(academicUnitFilter, academicUnits) : "ทุกหน่วยงาน"}</span>
              </summary>
              <div className="filters education-filters"><label className="field"><strong>มหาวิทยาลัย</strong><select className="select" value={universityFilter} onChange={(event) => { setUniversityFilter(event.target.value); setAcademicUnitFilter(""); }}><option value="">ทุกมหาวิทยาลัย</option>{universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}</select></label><label className="field"><strong>คณะ / ภาควิชา / สาขา</strong><select className="select" value={academicUnitFilter} onChange={(event) => setAcademicUnitFilter(event.target.value)}><option value="">ทุกหน่วยงาน</option>{academicUnits.filter((unit) => !universityFilter || unit.university_id === universityFilter).map((unit) => <option key={unit.id} value={unit.id}>{getAcademicUnitPath(unit.id, academicUnits)}</option>)}</select></label></div>
            </details>
            <div className="filters organization-filters"><strong>ประเภทหน่วยงาน</strong>{organizationTypes.map((type) => <label className={`chip organization-chip organization-${type === "ภาคเอกชน" ? "private" : type === "ภาครัฐ" ? "government" : type === "Software House" ? "software" : "unknown"}`} key={type}><input type="checkbox" checked={organizationTypesSelected.includes(type)} onChange={() => toggleOrganizationType(type)} />{type}</label>)}</div>
            <details className="filter-disclosure job-category-disclosure"><summary>ลักษณะงาน <span>{jobCategoriesSelected.length ? `เลือกแล้ว ${jobCategoriesSelected.length} หมวด` : "เลือกกรองหมวดงาน"}</span></summary><div className="filters">{jobCategories.map((category) => <label className="chip" key={category}><input type="checkbox" checked={jobCategoriesSelected.includes(category)} onChange={() => setJobCategoriesSelected((current) => current.includes(category) ? current.filter((value) => value !== category) : [...current, category])} />{category}</label>)}</div></details>
            <details className="filter-disclosure province-filter"><summary>จังหวัด <span>{provincesSelected[0] === UNKNOWN_PROVINCE_FILTER ? "ไม่ทราบจังหวัด" : provincesSelected[0] || "ทุกจังหวัด"}</span></summary><div className="province-filter-control"><select className="select" value={provincesSelected[0] ?? ""} onChange={(event) => changeProvince(event.target.value)}><option value="">ทุกจังหวัด</option><option value={UNKNOWN_PROVINCE_FILTER}>ไม่ทราบจังหวัด</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}</select></div></details>
          </div>
          <div className="results-scroll" ref={resultsScrollRef}>
            <div className="result-count">พบ {results.length} ประกาศ · ข้อมูลจาก Supabase</div>
            {loadError && <div className="notice" role="alert">โหลดข้อมูลจริงไม่สำเร็จ: {loadError}</div>}
            {results.map((item) => <article className={`card ${selected === item.companyId ? "selected" : ""}`} data-company-id={item.companyId} key={item.id} onClick={() => setSelected(item.companyId)}><h3>{item.company.name}</h3><p><strong>มหาวิทยาลัย/หน่วยงาน:</strong> {item.universityName || "ไม่ระบุ"} · {item.academicUnitName || "ไม่ระบุ"}</p><p><strong>ประเภทหน่วยงาน:</strong> {item.company.organizationType}</p><p><strong>ประเภทกิจการ:</strong> {item.company.businessType || "ไม่ระบุ"}</p><p><strong>ลักษณะงาน:</strong> {item.jobCategory}</p><p><strong>ตำแหน่งที่รับ:</strong> {item.positions.length ? item.positions.join(", ") : item.title}</p><p>{item.description}</p><div className="badges"><span className="badge">{item.company.organizationType}</span><span className="badge">{item.jobCategory}</span><span className="badge">{allowanceLabel(item)}</span></div><p><Link href={`/internships/${item.id}`} onClick={(event) => openDetail(event, item)}>ดูรายละเอียด →</Link></p></article>)}
            {!results.length && <div className="notice">ไม่พบประกาศที่ตรงกับเงื่อนไข ลองล้างตัวกรองหรือค้นหาคำอื่น</div>}
          </div>
        </section>
        <div className="map-detail-stage">
          <MapView companies={visibleCompanies} selectedCompanyId={selected} onSelect={setSelected} province={mapProvince} />
          {detailItem && <aside className="map-detail-panel" aria-labelledby="map-detail-title">
            <header className="map-detail-header">
              <div><span className="eyebrow">รายละเอียดสถานที่ฝึกงาน</span><h2 id="map-detail-title">{detailItem.title}</h2><p>{detailItem.company.name}</p></div>
              <button className="map-detail-close" type="button" aria-label="ปิดรายละเอียด" title="ปิดรายละเอียด (Esc)" onClick={() => setDetailItemId(undefined)}>×</button>
            </header>
            <div className="map-detail-content">
              <section className="map-detail-section">
                <h3>ข้อมูลตำแหน่ง</h3>
                <p><strong>มหาวิทยาลัย / หน่วยงาน</strong><span>{detailItem.universityName || "ไม่ระบุ"} · {detailItem.academicUnitName || "ไม่ระบุ"}</span></p>
                <p><strong>ผู้มีสิทธิ์สมัคร</strong><span>{detailItem.allUniversities ? "เปิดรับทุกมหาวิทยาลัย" : detailItem.universities.length ? detailItem.universities.join(", ") : detailItem.universityName || "ไม่ระบุ"}</span></p>
                <p><strong>ลักษณะงาน</strong><span>{detailItem.jobCategory}</span></p>
                <p><strong>ตำแหน่งที่รับ</strong><span>{detailItem.positions.length ? detailItem.positions.join(", ") : detailItem.title}</span></p>
                <p><strong>รายละเอียดงาน</strong><span className="preserve-lines">{detailItem.description || "ไม่ระบุ"}</span></p>
                {detailItem.qualifications.length > 0 && <p><strong>คุณสมบัติ</strong><span>{detailItem.qualifications.join(", ")}</span></p>}
                <p><strong>รูปแบบการทำงาน</strong><span>{{ onsite: "On-site", hybrid: "Hybrid", remote: "Remote", undisclosed: "ไม่ระบุ" }[detailItem.workMode]}</span></p>
                <p><strong>เบี้ยเลี้ยง</strong><span>{allowanceLabel(detailItem)}</span></p>
                {detailItem.openingsCount != null && <p><strong>จำนวนที่รับ</strong><span>{detailItem.openingsCount} คน</span></p>}
                {detailItem.applicationEndDate && <p><strong>ปิดรับสมัคร</strong><span>{detailItem.applicationEndDate}</span></p>}
                {detailItem.applicationLink && <p><strong>ช่องทางสมัคร</strong><span><a className="detail-link" href={detailItem.applicationLink} target="_blank" rel="noreferrer">เปิดลิงก์สมัคร</a></span></p>}
              </section>
              <section className="map-detail-section">
                <h3>สถานประกอบการ</h3>
                <p><strong>ประเภทหน่วยงาน</strong><span>{detailItem.company.organizationType || "ไม่ระบุ"}</span></p>
                <p><strong>ประเภทกิจการ</strong><span>{detailItem.company.businessType || "ไม่ระบุ"}</span></p>
                <p><strong>รายละเอียดบริษัท</strong><span className="preserve-lines">{detailItem.company.description || "ไม่ระบุ"}</span></p>
                <p><strong>ที่อยู่</strong><span>{[detailItem.company.address, detailItem.company.district, detailItem.company.province].filter(Boolean).join(" ") || "ไม่ระบุ"}</span></p>
                {detailItem.company.latitude != null && detailItem.company.longitude != null && <p><strong>พิกัด</strong><span>{detailItem.company.latitude}, {detailItem.company.longitude}</span></p>}
                {detailItem.company.googleMapsUrl && <p><strong>Google Maps</strong><span><a className="detail-link" href={detailItem.company.googleMapsUrl} target="_blank" rel="noreferrer">เปิดแผนที่</a></span></p>}
                {detailItem.company.website && <p><strong>เว็บไซต์</strong><span className="map-detail-links">{detailItem.company.website.split(/\r?\n/).filter(Boolean).map((website) => <a className="detail-link" href={website} target="_blank" rel="noreferrer" key={website}>{website}</a>)}</span></p>}
                {detailItem.company.facebook && <p><strong>Facebook</strong><span><a className="detail-link" href={detailItem.company.facebook} target="_blank" rel="noreferrer">เปิด Facebook</a></span></p>}
                {detailItem.company.phone && <p><strong>โทรศัพท์</strong><span><a className="detail-link" href={`tel:${detailItem.company.phone}`}>{detailItem.company.phone}</a></span></p>}
                {detailItem.company.email && <p><strong>อีเมล</strong><span><a className="detail-link" href={`mailto:${detailItem.company.email}`}>{detailItem.company.email}</a></span></p>}
                {detailItem.company.businessHours && <p><strong>เวลาทำการ</strong><span>{detailItem.company.businessHours}</span></p>}
                {detailItem.company.lastVerifiedAt && <p><strong>ตรวจสอบข้อมูล</strong><span>{detailItem.company.lastVerifiedAt}</span></p>}
              </section>
              {(detailItem.company.coordinatorName || detailItem.company.authorizedName || detailItem.company.advisorName || detailItem.company.advisorRecommendation) && <section className="map-detail-section">
                <h3>ผู้ประสานงานและคำแนะนำ</h3>
                {detailItem.company.coordinatorName && <p><strong>ผู้ประสานงาน</strong><span>{detailItem.company.coordinatorName}{detailItem.company.coordinatorTitle ? ` · ${detailItem.company.coordinatorTitle}` : ""}</span></p>}
                {detailItem.company.coordinatorPhone && <p><strong>โทรศัพท์ผู้ประสานงาน</strong><span><a className="detail-link" href={`tel:${detailItem.company.coordinatorPhone}`}>{detailItem.company.coordinatorPhone}</a></span></p>}
                {detailItem.company.authorizedName && <p><strong>ผู้มีอำนาจลงนาม</strong><span>{detailItem.company.authorizedName}{detailItem.company.authorizedTitle ? ` · ${detailItem.company.authorizedTitle}` : ""}</span></p>}
                {detailItem.company.advisorName && <p><strong>อาจารย์ผู้ให้คำแนะนำ</strong><span>{detailItem.company.advisorName}</span></p>}
                {detailItem.company.advisorRecommendation && <p><strong>คำแนะนำอาจารย์นิเทศ</strong><span className="preserve-lines">{detailItem.company.advisorRecommendation}</span></p>}
              </section>}
              {detailItem.lastVerifiedAt && <p className="map-detail-verified">ตรวจสอบประกาศล่าสุด: {detailItem.lastVerifiedAt}</p>}
            </div>
            <footer className="map-detail-actions">
              <button className="button" type="button" onClick={() => window.print()} aria-label="บันทึกรายละเอียดเป็นไฟล์ PDF">บันทึกเป็น PDF</button>
            </footer>
          </aside>}
        </div>
      </main>
      <footer className="site-footer"><span>INTERNSHIP-MAP</span><span>ข้อมูลเพื่อการค้นหาเบื้องต้น · ตรวจสอบข้อมูลล่าสุดก่อนสมัคร</span></footer>
    </div>
  );
}
