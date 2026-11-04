"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type University = { id: string; code: string; name: string; short_name: string | null; province: string | null };
type AcademicUnit = { id: string; university_id: string; parent_id: string | null; code: string; name: string; unit_type: string; is_active: boolean };
type Directory = { universities: University[]; units: AcademicUnit[] };

const unitTypeLabels: Record<string, string> = {
  campus: "วิทยาเขต",
  faculty: "คณะ",
  department: "ภาควิชา",
  program: "สาขา/หลักสูตร",
  other: "หน่วยงานอื่น"
};

export function AcademicStructureManager() {
  const [directory, setDirectory] = useState<Directory>({ universities: [], units: [] });
  const [universityForm, setUniversityForm] = useState({ code: "", name: "", shortName: "", province: "" });
  const [unitForm, setUnitForm] = useState({ universityId: "", parentId: "", code: "", name: "", unitType: "faculty" });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDirectory() {
    const response = await fetch("/api/academic-units", { cache: "no-store" });
    const payload = await response.json() as { data?: Directory; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "โหลดข้อมูลมหาวิทยาลัยไม่สำเร็จ");
    const next = payload.data ?? { universities: [], units: [] };
    setDirectory(next);
    setUnitForm((current) => ({
      ...current,
      universityId: next.universities.some((university) => university.id === current.universityId)
        ? current.universityId
        : next.universities[0]?.id ?? ""
    }));
  }

  useEffect(() => {
    loadDirectory()
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const unitChoices = useMemo(
    () => directory.units.filter((unit) => unit.university_id === unitForm.universityId),
    [directory.units, unitForm.universityId]
  );

  async function save(kind: "university" | "unit", event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = kind === "university"
        ? { kind, ...universityForm }
        : { kind, ...unitForm, parentId: unitForm.parentId || undefined };
      const response = await fetch("/api/academic-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      await loadDirectory();
      window.dispatchEvent(new Event("academic-directory-updated"));
      if (kind === "university") setUniversityForm({ code: "", name: "", shortName: "", province: "" });
      else setUnitForm((current) => ({ ...current, parentId: "", code: "", name: "" }));
      setMessage(kind === "university" ? "เพิ่มมหาวิทยาลัยเรียบร้อยแล้ว" : "เพิ่มหน่วยงานเรียบร้อยแล้ว");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <section className={`category-settings ${open ? "category-settings-open" : ""}`}>
    <button className="category-settings-toggle" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span><h2>จัดการมหาวิทยาลัยและหน่วยงาน</h2><p>เพิ่มมหาวิทยาลัย คณะ ภาควิชา และสาขา เพื่อใช้กับตัวกรองและ Excel Import</p></span>
      <b aria-hidden="true">{open ? "−" : "+"}</b>
    </button>
    {open && <div className="category-settings-content">
      {error && <div className="notice" role="alert">{error}</div>}
      {message && <div className="notice success-notice" role="status">{message}</div>}
      {loading ? <p>กำลังโหลดโครงสร้าง...</p> : <>
        <form className="academic-structure-form" onSubmit={(event) => save("university", event)}>
          <h3>เพิ่มมหาวิทยาลัย</h3>
          <div className="category-add">
            <input className="input" placeholder="รหัส เช่น CMU" value={universityForm.code} onChange={(event) => setUniversityForm({ ...universityForm, code: event.target.value })} required maxLength={32} />
            <input className="input" placeholder="ชื่อมหาวิทยาลัย" value={universityForm.name} onChange={(event) => setUniversityForm({ ...universityForm, name: event.target.value })} required maxLength={255} />
            <input className="input" placeholder="ชื่อย่อ (ไม่บังคับ)" value={universityForm.shortName} onChange={(event) => setUniversityForm({ ...universityForm, shortName: event.target.value })} maxLength={100} />
            <button className="button" type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "เพิ่มมหาวิทยาลัย"}</button>
          </div>
        </form>
        <form className="academic-structure-form" onSubmit={(event) => save("unit", event)}>
          <h3>เพิ่มคณะ / ภาควิชา / สาขา</h3>
          <div className="academic-unit-form-grid">
            <select className="select" value={unitForm.universityId} onChange={(event) => setUnitForm({ ...unitForm, universityId: event.target.value, parentId: "" })} required>
              <option value="">เลือกมหาวิทยาลัย</option>
              {directory.universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
            </select>
            <select className="select" value={unitForm.unitType} onChange={(event) => setUnitForm({ ...unitForm, unitType: event.target.value })}>
              {Object.entries(unitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="select" value={unitForm.parentId} onChange={(event) => setUnitForm({ ...unitForm, parentId: event.target.value })}>
              <option value="">ไม่มีหน่วยงานแม่ (ระดับบนสุด)</option>
              {unitChoices.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {unitTypeLabels[unit.unit_type] ?? unit.unit_type}</option>)}
            </select>
            <input className="input" placeholder="รหัส เช่น SCI หรือ COMSCI" value={unitForm.code} onChange={(event) => setUnitForm({ ...unitForm, code: event.target.value })} required maxLength={32} />
            <input className="input" placeholder="ชื่อหน่วยงาน" value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} required maxLength={255} />
            <button className="button" type="submit" disabled={saving || !unitForm.universityId}>{saving ? "กำลังบันทึก..." : "เพิ่มหน่วยงาน"}</button>
          </div>
        </form>
        <div className="academic-structure-list">
          {directory.universities.map((university) => <article key={university.id}>
            <strong>{university.name} ({university.code})</strong>
            <ul>{directory.units.filter((unit) => unit.university_id === university.id).map((unit) => {
              const parent = directory.units.find((candidate) => candidate.id === unit.parent_id);
              return <li key={unit.id}>{unit.name} <small>({unit.code}) · {unitTypeLabels[unit.unit_type] ?? unit.unit_type}{parent ? ` · ${parent.name}` : ""}</small></li>;
            })}</ul>
          </article>)}
        </div>
      </>}
    </div>}
  </section>;
}
