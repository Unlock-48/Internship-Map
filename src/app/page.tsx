"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { searchInternships } from "@/lib/search";
import { InternshipResult } from "@/types/domain";
import { jobCategories } from "@/lib/job-category";
import { organizationTypes } from "@/lib/organization-type";
import { provinces as allProvinces } from "@/lib/province";

const MapView = dynamic(() => import("@/components/map-view").then((module) => module.MapView), { ssr: false });
const allowanceLabel = (item: InternshipResult) => {
  if (item.allowanceType === "unpaid") return "ไม่มีเบี้ยเลี้ยง";
  if (item.allowanceType === "undisclosed") return "ไม่เปิดเผยเบี้ยเลี้ยง";
  if (item.allowanceType === "negotiable") return "เบี้ยเลี้ยงตามตกลง";
  return `${item.allowanceMin?.toLocaleString()} บาท/${item.allowancePeriod === "monthly" ? "เดือน" : "วัน"}`;
};

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [organizationTypesSelected, setOrganizationTypesSelected] = useState<string[]>([]);
  const [jobCategoriesSelected, setJobCategoriesSelected] = useState<string[]>([]);
  const [provincesSelected, setProvincesSelected] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>();
  const [items, setItems] = useState<InternshipResult[]>([]);
  const [loadError, setLoadError] = useState("");
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/internships")
      .then(async (response) => {
        const payload = await response.json() as { data?: InternshipResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "ไม่สามารถโหลดข้อมูลได้");
        if (active && payload.data) {
          setItems(payload.data);
        }
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      });
    return () => { active = false; };
  }, []);
  const provinces = allProvinces;
  const results = useMemo(() => searchInternships(items, { q: query, organizationTypes: organizationTypesSelected, jobCategories: jobCategoriesSelected, provinces: provincesSelected }), [items, query, organizationTypesSelected, jobCategoriesSelected, provincesSelected]);
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

  return (
    <div className="home-shell">
      <main className="workspace">
        <section className="panel">
          <div className="panel-header">
            <div className="search"><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาบริษัท ตำแหน่ง หรือพื้นที่..." aria-label="ค้นหาฝึกงาน" /><button className="button secondary" onClick={() => { setQuery(""); setOrganizationTypesSelected([]); setJobCategoriesSelected([]); setProvincesSelected([]); }}>ล้าง</button></div>
            <div className="filters organization-filters"><strong>ประเภทหน่วยงาน</strong>{organizationTypes.map((type) => <label className={`chip organization-chip organization-${type === "ภาคเอกชน" ? "private" : type === "ภาครัฐ" ? "government" : type === "Software House" ? "software" : "unknown"}`} key={type}><input type="checkbox" checked={organizationTypesSelected.includes(type)} onChange={() => toggleOrganizationType(type)} />{type}</label>)}</div>
            <details className="filter-disclosure" open><summary>ลักษณะงาน <span>เลือกกรองหมวดงาน</span></summary><div className="filters">{jobCategories.map((category) => <label className="chip" key={category}><input type="checkbox" checked={jobCategoriesSelected.includes(category)} onChange={() => setJobCategoriesSelected((current) => current.includes(category) ? current.filter((value) => value !== category) : [...current, category])} />{category}</label>)}</div></details>
            <details className="filter-disclosure province-filter"><summary>จังหวัด <span>เลือกจังหวัด</span></summary><div className="province-filter-control"><select className="select" value={provincesSelected[0] ?? ""} onChange={(event) => setProvincesSelected(event.target.value ? [event.target.value] : [])}><option value="">ทุกจังหวัด</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}</select></div></details>
          </div>
          <div className="results-scroll" ref={resultsScrollRef}>
            <div className="result-count">พบ {results.length} ประกาศ · ข้อมูลจาก Supabase</div>
            {loadError && <div className="notice" role="alert">โหลดข้อมูลจริงไม่สำเร็จ: {loadError}</div>}
            {results.map((item) => <article className={`card ${selected === item.companyId ? "selected" : ""}`} data-company-id={item.companyId} key={item.id} onClick={() => setSelected(item.companyId)}><h3>{item.company.name}</h3><p><strong>ประเภทหน่วยงาน:</strong> {item.company.organizationType}</p><p><strong>ประเภทกิจการ:</strong> {item.company.businessType || "ไม่ระบุ"}</p><p><strong>ลักษณะงาน:</strong> {item.jobCategory}</p><p><strong>ตำแหน่งที่รับ:</strong> {item.positions.length ? item.positions.join(", ") : item.title}</p><p>{item.description}</p><div className="badges"><span className="badge">{item.company.organizationType}</span><span className="badge">{item.jobCategory}</span><span className="badge">{allowanceLabel(item)}</span></div><p><Link href={`/internships/${item.id}`}>ดูรายละเอียด →</Link></p></article>)}
            {!results.length && <div className="notice">ไม่พบประกาศที่ตรงกับเงื่อนไข ลองล้างตัวกรองหรือค้นหาคำอื่น</div>}
          </div>
        </section>
        <MapView companies={visibleCompanies} selectedCompanyId={selected} onSelect={setSelected} />
      </main>
      <footer className="site-footer"><span>INTERNSHIP-MAP</span><span>ข้อมูลเพื่อการค้นหาเบื้องต้น · ตรวจสอบข้อมูลล่าสุดก่อนสมัคร</span></footer>
    </div>
  );
}
