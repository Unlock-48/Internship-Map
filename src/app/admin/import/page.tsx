"use client";

import { ChangeEvent, Fragment, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createImportWorkbook, validateImportRows, type ImportRow } from "@/lib/import-workbook";
import { getAcademicUnitPath } from "@/lib/academic-units";

type Preview = {
  fileName: string;
  headers: string[];
  rows: ImportRow[];
  summary: { total: number; valid: number; invalid: number };
};
type University = { id: string; code: string; name: string };
type AcademicUnit = { id: string; university_id: string; parent_id: string | null; code: string; name: string; unit_type: string };
type EditableField = Exclude<keyof ImportRow, "rowNumber" | "errors" | "companyExistsInDatabase" | "duplicateInDatabase" | "duplicateInFile" | "universityCode" | "universityName" | "academicUnitCode" | "academicUnitName" | "companyId">;
type RowFilter = "all" | "valid" | "invalid" | "existing" | "new";
const editableFields: { key: EditableField; label: string; multiline?: boolean }[] = [
  { key: "companyName", label: "ชื่อสถานประกอบการ" },
  { key: "businessType", label: "ประเภทกิจการ" },
  { key: "companyDescription", label: "รายละเอียดบริษัท", multiline: true },
  { key: "jobDescription", label: "รายละเอียดงาน", multiline: true },
  { key: "website", label: "เว็บไซต์ (ใส่หลายลิงก์แยกบรรทัด)" , multiline: true },
  { key: "allUrl", label: "ลิงก์เพิ่มเติม" },
  { key: "facebook", label: "Facebook" },
  { key: "phone", label: "เบอร์โทรศัพท์บริษัท" },
  { key: "email", label: "อีเมลบริษัท" },
  { key: "status", label: "สถานะบริษัท" },
  { key: "lastVerifiedAt", label: "วันที่ตรวจสอบล่าสุด" },
  { key: "coordinatorName", label: "ชื่อ-สกุล ผู้ประสานงาน/HR" },
  { key: "coordinatorTitle", label: "ตำแหน่ง ผู้ประสานงาน" },
  { key: "coordinatorPhone", label: "เบอร์โทรศัพท์" },
  { key: "authorizedName", label: "ชื่อ-สกุล ผู้มีอำนาจลงนาม" },
  { key: "authorizedTitle", label: "ตำแหน่ง ผู้มีอำนาจลงนาม" },
  { key: "businessHours", label: "เวลาทำการ" },
  { key: "advisorRecommendation", label: "คำแนะนำของอาจารย์นิเทศ", multiline: true },
  { key: "advisorName", label: "อาจารย์ผู้ให้คำแนะนำ" }
];

function PositionField({ rowNumber, value, suggestions, disabled, onChange }: {
  rowNumber: number;
  value: string;
  suggestions: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const listId = `position-suggestions-${rowNumber}`;
  const matchingSuggestions = suggestions
    .filter((suggestion) => suggestion.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .filter((suggestion) => suggestion !== value)
    .slice(0, 8);

  useEffect(() => setQuery(value), [value]);

  return <label className="field import-position-field">
    ตำแหน่งที่รับ
    <input
      className="input"
      type="text"
      list={listId}
      value={value}
      disabled={disabled}
      placeholder="พิมพ์ค้นหา หรือเลือกตำแหน่งแนะนำ"
      onChange={(event) => {
        setQuery(event.target.value);
        onChange(event.target.value);
      }}
    />
    <datalist id={listId}>{suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>
    {matchingSuggestions.length > 0 && <div className="position-suggestions" role="group" aria-label="ตำแหน่งแนะนำจากไฟล์">
      {matchingSuggestions.map((suggestion) => <button
        className="position-suggestion"
        key={suggestion}
        type="button"
        disabled={disabled}
        onClick={() => {
          setQuery(suggestion);
          onChange(suggestion);
        }}
      >{suggestion}</button>)}
    </div>}
  </label>;
}

export default function ImportPage() {
  const [preview, setPreview] = useState<Preview>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [committed, setCommitted] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [academicUnits, setAcademicUnits] = useState<AcademicUnit[]>([]);
  const [universityId, setUniversityId] = useState("");
  const [academicUnitId, setAcademicUnitId] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [originalFile, setOriginalFile] = useState<File>();
  const [editingRowNumber, setEditingRowNumber] = useState<number>();
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [geocodingRowNumber, setGeocodingRowNumber] = useState<number>();
  const [locationFeedback, setLocationFeedback] = useState<{ rowNumber: number; message: string; success: boolean }>();
  const [classifying, setClassifying] = useState(false);
  const [classificationDirty, setClassificationDirty] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/academic-units", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { data?: { universities: University[]; units: AcademicUnit[] }; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "โหลดมหาวิทยาลัยและหน่วยงานไม่สำเร็จ");
        const nextUniversities = payload.data?.universities ?? [];
        const nextUnits = payload.data?.units ?? [];
        if (!active) return;
        setUniversities(nextUniversities);
        setAcademicUnits(nextUnits);
        const defaultUniversity = nextUniversities.find((item) => item.code === "CMRU") ?? nextUniversities[0];
        const defaultUnit = nextUnits.find((item) => item.code === "COMSCI" && item.university_id === defaultUniversity?.id)
          ?? nextUnits.find((item) => item.university_id === defaultUniversity?.id);
        setUniversityId(defaultUniversity?.id ?? "");
        setAcademicUnitId(defaultUnit?.id ?? "");
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setDirectoryLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedUniversity = universities.find((university) => university.id === universityId);
  const availableUnits = academicUnits.filter((unit) => unit.university_id === universityId);
  const selectedAcademicUnit = availableUnits.find((unit) => unit.id === academicUnitId);

  function validateRows(rows: ImportRow[], university = selectedUniversity, unit = selectedAcademicUnit) {
    const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
    return validateImportRows(rows).map((row) => {
      const errors = [...row.errors];
      const rowUniversity = row.universityCode || row.universityName;
      const rowUnit = row.academicUnitCode || row.academicUnitName;
      if (university && rowUniversity && ![university.code, university.name].some((value) => normalize(value) === normalize(rowUniversity))) {
        errors.push(`มหาวิทยาลัย "${rowUniversity}" ไม่ตรงกับ ${university.name}`);
      }
      if (unit && rowUnit && ![unit.code, unit.name].some((value) => normalize(value) === normalize(rowUnit))) {
        errors.push(`หน่วยงาน "${rowUnit}" ไม่ตรงกับ ${unit.name}`);
      }
      return { ...row, errors };
    });
  }

  function updateCurrentRows(update: (rows: ImportRow[]) => ImportRow[]) {
    setPreview((current) => {
      if (!current) return current;
      const rows = validateRows(update(current.rows));
      return {
        ...current,
        rows,
        summary: {
          total: rows.length,
          valid: rows.filter((row) => row.errors.length === 0 && !row.duplicateInDatabase).length,
          invalid: rows.filter((row) => row.errors.length > 0 || row.duplicateInDatabase).length
        }
      };
    });
  }

  function updateRows(rows: ImportRow[]) {
    updateCurrentRows(() => rows);
  }

  function updateRow(rowNumber: number, key: EditableField, value: string) {
    if (!preview) return;
    if (key === "companyName" || key === "positionTitle" || key === "jobDescription") setClassificationDirty(true);
    updateRows(preview.rows.map((row) => row.rowNumber === rowNumber ? { ...row, [key]: value } : row));
  }

  async function classifyCurrentRows() {
    if (!preview) return;
    setClassifying(true);
    setError("");
    try {
      const response = await fetch("/api/admin/import/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows })
      });
      const payload = await response.json() as { rows?: ImportRow[]; error?: string };
      if (!response.ok || !payload.rows) throw new Error(payload.error ?? "แยกกลุ่มข้อมูลไม่สำเร็จ");
      updateRows(payload.rows);
      setClassificationDirty(false);
      setRowFilter("all");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "แยกกลุ่มข้อมูลไม่สำเร็จ");
    } finally {
      setClassifying(false);
    }
  }

  function downloadRows(rows: ImportRow[], suffix: string) {
    if (!preview || !rows.length) return;
    try {
      const workbook = createImportWorkbook(rows);
      const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${preview.fileName.replace(/\.xlsx$/i, "")}-${suffix}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? `สร้างไฟล์ดาวน์โหลดไม่สำเร็จ: ${reason.message}` : "สร้างไฟล์ดาวน์โหลดไม่สำเร็จ");
    }
  }

  async function autoFillLocation(row: ImportRow) {
    setGeocodingRowNumber(row.rowNumber);
    setLocationFeedback(undefined);
    try {
      const response = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: row.address,
          district: row.district,
          province: row.province,
          googleMapsUrl: row.googleMapsUrl
        })
      });
      const payload = await response.json() as {
        latitude?: number;
        longitude?: number;
        address?: string;
        district?: string;
        province?: string;
        displayName?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "เติมข้อมูลตำแหน่งไม่สำเร็จ");
      if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
        throw new Error("ไม่พบพิกัดที่ถูกต้อง กรุณากรอกพิกัดเอง");
      }
      updateCurrentRows((rows) => rows.map((current) => current.rowNumber === row.rowNumber ? {
        ...current,
        latitude: String(payload.latitude),
        longitude: String(payload.longitude),
        address: current.address || payload.address || payload.displayName || "",
        district: current.district || payload.district || "",
        province: current.province || payload.province || ""
      } : current));
      setLocationFeedback({ rowNumber: row.rowNumber, message: "เติมพิกัดจากข้อมูลตำแหน่งแล้ว ตรวจสอบความถูกต้องก่อนบันทึก", success: true });
    } catch (reason) {
      setLocationFeedback({
        rowNumber: row.rowNumber,
        message: reason instanceof Error ? reason.message : "เติมข้อมูลตำแหน่งไม่สำเร็จ",
        success: false
      });
    } finally {
      setGeocodingRowNumber(undefined);
    }
  }

  function downloadIncompleteRows() {
    downloadRows(preview?.rows.filter((row) => row.errors.length > 0) ?? [], "ข้อมูลไม่ครบ");
  }

  function addRow() {
    if (!preview) return;
    const rowNumber = Math.max(0, ...preview.rows.map((row) => row.rowNumber)) + 1;
    const newRow: ImportRow = {
      rowNumber,
      universityCode: selectedUniversity?.code ?? "",
      universityName: selectedUniversity?.name ?? "",
      academicUnitCode: selectedAcademicUnit?.code ?? "",
      academicUnitName: selectedAcademicUnit?.name ?? "",
      companyId: "",
      companyName: "",
      businessType: "",
      companyDescription: "",
      positionTitle: "",
      jobDescription: "",
      address: "",
      road: "",
      subdistrict: "",
      district: "",
      province: "",
      postalCode: "",
      latitude: "",
      longitude: "",
      website: "",
      facebook: "",
      phone: "",
      email: "",
      allUrl: "",
      status: "",
      lastVerifiedAt: "",
      googleMapsUrl: "",
      coordinatorName: "",
      coordinatorTitle: "",
      coordinatorPhone: "",
      authorizedName: "",
      authorizedTitle: "",
      businessHours: "",
      advisorRecommendation: "",
      advisorName: "",
      companyExistsInDatabase: false,
      duplicateInDatabase: false,
      duplicateInFile: false,
      errors: []
    };
    updateRows([...preview.rows, newRow]);
    setClassificationDirty(true);
    setRowFilter("all");
    setEditingRowNumber(rowNumber);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!selectedUniversity || !selectedAcademicUnit) {
      setError("กรุณาเลือกมหาวิทยาลัยและหน่วยงานก่อนอัปโหลดไฟล์");
      event.target.value = "";
      return;
    }
    setOriginalFile(file);
    setLoading(true);
    setError("");
    setUploadMessage("");
    setCommitMessage("");
    setCommitted(false);
    setClassificationDirty(false);
    setRowFilter("all");
    setLocationFeedback(undefined);
    setPreview(undefined);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/admin/import/preview", { method: "POST", body: formData });
      const payload = await response.json() as Preview & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "อ่านไฟล์ไม่สำเร็จ");
      const rows = validateRows(payload.rows);
      setPreview({
        ...payload,
        rows,
        summary: {
          total: rows.length,
          valid: rows.filter((row) => row.errors.length === 0 && !row.duplicateInDatabase).length,
          invalid: rows.filter((row) => row.errors.length > 0 || row.duplicateInDatabase).length
        }
      });
      setEditingRowNumber(undefined);
      setUploadMessage(`อัปโหลดไฟล์สำเร็จ: ${file.name} · พบข้อมูล ${payload.summary.total} แถว`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "อ่านไฟล์ไม่สำเร็จ");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function commitImport() {
    if (!preview || classificationDirty || preview.summary.valid === 0 || !originalFile || !selectedUniversity || !selectedAcademicUnit) return;
    setCommitting(true);
    setCommitMessage("");
    try {
      const body = new FormData();
      body.append("file", originalFile);
      body.append("universityId", selectedUniversity.id);
      body.append("academicUnitId", selectedAcademicUnit.id);
      body.append("rows", JSON.stringify(preview.rows.filter((row) => row.errors.length === 0 && !row.duplicateInDatabase)));
      const response = await fetch("/api/admin/import/commit", { method: "POST", body });
      const payload = await response.json() as { imported?: number; updated?: number; skipped?: number; processed?: number; total?: number; batchId?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "นำเข้าข้อมูลไม่สำเร็จ");
      const processed = payload.processed ?? 0;
      const total = payload.total ?? preview.summary.valid;
      setCommitted(true);
      setCommitMessage(`ดำเนินการเสร็จสมบูรณ์ · Batch ${payload.batchId ?? "-"} · ตรวจสอบแล้ว ${processed}/${total} แถว · เพิ่มใหม่ ${payload.imported ?? 0} · อัปเดตเดิม ${payload.updated ?? 0} · ไม่เปลี่ยนแปลง ${payload.skipped ?? 0}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "นำเข้าข้อมูลไม่สำเร็จ");
    } finally {
      setCommitting(false);
    }
  }

  const filePicker = <input type="file" accept=".xlsx" onChange={upload} disabled={loading || directoryLoading || !selectedUniversity || !selectedAcademicUnit} />;
  const visibleRows = preview?.rows.filter((row) => {
    if (rowFilter === "all") return true;
    if (rowFilter === "valid") return row.errors.length === 0 && !row.duplicateInDatabase;
    if (rowFilter === "invalid") return row.errors.length > 0 || row.duplicateInDatabase;
    if (rowFilter === "existing") return row.duplicateInDatabase || row.duplicateInFile;
    return !row.duplicateInDatabase && !row.duplicateInFile;
  }) ?? [];
  const positionSuggestions = [...new Set(preview?.rows.map((row) => row.positionTitle.trim()).filter(Boolean) ?? [])];
  const databaseDuplicateCount = preview?.rows.filter((row) => row.duplicateInDatabase).length ?? 0;
  const fileDuplicateCount = preview?.rows.filter((row) => row.duplicateInFile).length ?? 0;
  const existingCompanyNewItemCount = preview?.rows.filter((row) => row.companyExistsInDatabase && !row.duplicateInDatabase && !row.duplicateInFile).length ?? 0;
  const newCompanyCount = preview?.rows.filter((row) => !row.companyExistsInDatabase && !row.duplicateInDatabase && !row.duplicateInFile).length ?? 0;
  const newItemCount = preview?.rows.filter((row) => !row.duplicateInDatabase && !row.duplicateInFile).length ?? 0;
  const incompleteCount = preview?.rows.filter((row) => row.errors.length > 0).length ?? 0;

  return <main className="page import-page">
    <div className="import-header">
      <div>
        <h1>นำเข้าข้อมูลจาก Excel</h1>
        <div className="import-unit-selectors">
          <label className="field"><strong>มหาวิทยาลัยเจ้าของข้อมูล</strong><select className="select" value={universityId} disabled={directoryLoading || Boolean(preview)} onChange={(event) => {
            const nextId = event.target.value;
            const nextUnit = academicUnits.find((unit) => unit.university_id === nextId);
            setUniversityId(nextId);
            setAcademicUnitId(nextUnit?.id ?? "");
          }}><option value="">เลือกมหาวิทยาลัย</option>{universities.map((university) => <option key={university.id} value={university.id}>{university.name} ({university.code})</option>)}</select></label>
          <label className="field"><strong>คณะ / ภาควิชา / สาขาเจ้าของข้อมูล</strong><select className="select" value={academicUnitId} disabled={directoryLoading || !universityId || Boolean(preview)} onChange={(event) => setAcademicUnitId(event.target.value)}><option value="">เลือกหน่วยงาน</option>{availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{getAcademicUnitPath(unit.id, availableUnits)} ({unit.code})</option>)}</select></label>
          {selectedUniversity && selectedAcademicUnit && <small>ข้อมูลในไฟล์นี้จะถูกผูกกับ {selectedUniversity.name} · {selectedAcademicUnit.name}</small>}
        </div>
      </div>
    </div>
    {loading && <div className="upload-progress" role="status"><span className="loading-dot" />กำลังอ่านไฟล์และเตรียมข้อมูล...</div>}
    {error && <div className="notice" role="alert">{error}</div>}
    {uploadMessage && <div className="notice success-notice" role="status"><span aria-hidden="true">✓</span> {uploadMessage}</div>}
    {!preview && <section className="upload-hero">
      <div className="upload-icon" aria-hidden="true">↑</div>
      <h2>เริ่มต้นด้วยการอัปโหลดไฟล์</h2>
      <p>รองรับไฟล์ Excel .xlsx · ข้อมูลใหม่จะเผยแพร่ทันที และเก็บไฟล์ต้นฉบับพร้อมประวัติการนำเข้า</p>
      <label className="button upload-primary">เลือกไฟล์ Excel{filePicker}</label>
      <small>ขนาดไฟล์ไม่เกิน 10 MB</small>
    </section>}
    {preview && <section className="import-results">
      <div className="import-summary">
        <div className="result-heading"><div><p className="eyebrow">PREVIEW RESULT</p><h2>{preview.fileName}</h2></div><span className="file-status">พร้อมตรวจสอบ</span></div>
        <div className="import-metrics" role="group" aria-label="กรองแถวตามสถานะ">
          <button className="metric metric-filter" type="button" aria-pressed={rowFilter === "all"} onClick={() => setRowFilter("all")}>ทั้งหมด<strong>{preview.summary.total}</strong><small>แถวในไฟล์</small></button>
          <button className="metric metric-valid metric-filter" type="button" aria-pressed={rowFilter === "valid"} onClick={() => setRowFilter("valid")}>รายการใหม่พร้อมนำเข้า<strong>{preview.summary.valid}</strong><small>รายการ</small></button>
          <button className="metric metric-invalid metric-filter" type="button" aria-pressed={rowFilter === "invalid"} onClick={() => setRowFilter("invalid")}>ไม่พร้อมนำเข้า<strong>{preview.summary.invalid}</strong><small>ข้อมูลไม่ครบหรือซ้ำ</small></button>
        </div>
        <div className="import-classification" aria-label="แยกกลุ่มข้อมูล">
          <button className="button secondary" type="button" disabled={classificationDirty || classifying} aria-pressed={rowFilter === "existing"} onClick={() => setRowFilter("existing")}>
            บริษัท/ตำแหน่งเดิมหรือซ้ำในไฟล์ <strong>{databaseDuplicateCount + fileDuplicateCount}</strong>
          </button>
          <button className="button secondary" type="button" disabled={classificationDirty || classifying} aria-pressed={rowFilter === "new"} onClick={() => setRowFilter("new")}>
            รายการใหม่ <strong>{newItemCount}</strong>
            <small>บริษัทเดิมตำแหน่ง/รายละเอียดใหม่ {existingCompanyNewItemCount} · บริษัทใหม่ {newCompanyCount}</small>
          </button>
          <button className="button secondary classify-button" type="button" disabled={classifying || committed} onClick={() => void classifyCurrentRows()}>
            {classifying ? "กำลังแยกข้อมูล..." : "⟳ แยกบริษัทเดิมจากฐานข้อมูล"}
          </button>
        </div>
        {classificationDirty && <div className="notice import-classification-notice" role="status">มีการแก้ชื่อบริษัท ตำแหน่ง หรือรายละเอียดงาน กรุณากด “แยกบริษัทเดิมจากฐานข้อมูล” อีกครั้งก่อนดาวน์โหลดหรือนำเข้า</div>}
        <div className="table-heading"><div><h3>ตรวจสอบและแก้ไขข้อมูล</h3><span>แสดง {visibleRows.length} / {preview.rows.length} แถว</span></div><div className="form-actions">
          <button className="button secondary" type="button" disabled={classificationDirty || newItemCount === 0} onClick={() => downloadRows(preview.rows.filter((row) => !row.duplicateInDatabase && !row.duplicateInFile), "รายการใหม่")}>↓ ดาวน์โหลดเฉพาะรายการใหม่ ({newItemCount})</button>
          <button className="button secondary" type="button" disabled={incompleteCount === 0} onClick={downloadIncompleteRows}>ดาวน์โหลดข้อมูลไม่ครบ ({incompleteCount})</button>
          <button className="button secondary" type="button" disabled={committed} onClick={() => {
          if (!preview || !selectedUniversity || !selectedAcademicUnit) return;
          updateRows(preview.rows.map((row) => ({
            ...row,
            universityCode: selectedUniversity.code,
            universityName: selectedUniversity.name,
            academicUnitCode: selectedAcademicUnit.code,
            academicUnitName: selectedAcademicUnit.name
          })));
        }}>ใช้มหาวิทยาลัย/หน่วยงานที่เลือกกับทุกแถว</button><button className="button secondary" type="button" disabled={committed} onClick={addRow}>＋ เพิ่มรายการ</button></div></div>
        <p className="page-description">ระบบตรวจชื่อบริษัท + ตำแหน่ง + รายละเอียดงานเทียบกับฐานข้อมูลแล้ว รายการซ้ำจะแสดงในกลุ่มบริษัท/ตำแหน่งเดิมและไม่ถูกนำเข้า ส่วนตำแหน่งหรือรายละเอียดงานใหม่ของบริษัทเดิมจะแสดงในกลุ่มรายการใหม่ คุณสามารถแก้ไขข้อมูลก่อนดาวน์โหลดหรือนำเข้าได้</p>
        <div className="table-wrap"><table><thead><tr><th>แถว</th><th>บริษัท</th><th>ประเภทกิจการ</th><th>ตำแหน่ง</th><th>จังหวัด</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{visibleRows.map((row) => <Fragment key={row.rowNumber}>
          <tr>
            <td>{row.rowNumber}</td><td>{row.companyName || "ไม่ระบุ"}</td><td>{row.businessType || "ไม่ระบุ"}</td><td>{row.positionTitle || "ไม่ระบุ"}</td><td>{row.province || "ไม่ระบุ"}</td>
            <td className={row.errors.length ? "invalid-cell" : row.duplicateInDatabase ? "duplicate-cell" : "valid-cell"}>
              <strong>{row.duplicateInFile ? "รายการซ้ำในไฟล์" : row.duplicateInDatabase ? "บริษัท/ตำแหน่งมีอยู่แล้ว" : row.companyExistsInDatabase ? "บริษัทเดิม · รายการใหม่" : "บริษัทใหม่"}</strong>
              {row.errors.length > 0 && <span className="import-row-errors">{row.errors.join(" · ")}</span>}
              {!row.errors.length && !row.duplicateInDatabase && <span className="import-row-errors">พร้อมนำเข้า</span>}
            </td>
            <td><button className="button secondary" type="button" disabled={committed} onClick={() => setEditingRowNumber((current) => current === row.rowNumber ? undefined : row.rowNumber)}>{editingRowNumber === row.rowNumber ? "ปิด" : "แก้ไข"}</button></td>
          </tr>
          {editingRowNumber === row.rowNumber && <tr className="import-edit-row"><td colSpan={7}>
            <section className="import-location-panel" aria-label="แก้ไขข้อมูลตำแหน่ง">
              <div className="import-location-heading">
                <div><h4>ข้อมูลตำแหน่ง</h4><p>วางลิงก์ Google Maps แล้วกดเติมอัตโนมัติ หรือกรอกพิกัดด้วยตนเอง</p></div>
                <button className="button secondary" type="button" disabled={committed || geocodingRowNumber !== undefined} onClick={() => void autoFillLocation(row)}>
                  {geocodingRowNumber === row.rowNumber ? "กำลังค้นหาตำแหน่ง..." : "เติมตำแหน่งอัตโนมัติ"}
                </button>
              </div>
              <div className="import-location-grid">
                <label className="field">ลิงก์ Google Maps
                  <input className="input" value={row.googleMapsUrl} disabled={committed || geocodingRowNumber === row.rowNumber} placeholder="https://maps.google.com/..." onChange={(event) => updateRow(row.rowNumber, "googleMapsUrl", event.target.value)} />
                </label>
                <label className="field">ที่อยู่
                  <input className="input" value={row.address} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "address", event.target.value)} />
                </label>
                <label className="field">ถนน
                  <input className="input" value={row.road} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "road", event.target.value)} />
                </label>
                <label className="field">ตำบล / แขวง
                  <input className="input" value={row.subdistrict} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "subdistrict", event.target.value)} />
                </label>
                <label className="field">อำเภอ / เขต
                  <input className="input" value={row.district} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "district", event.target.value)} />
                </label>
                <label className="field">จังหวัด
                  <input className="input" value={row.province} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "province", event.target.value)} />
                </label>
                <label className="field">รหัสไปรษณีย์
                  <input className="input" value={row.postalCode} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "postalCode", event.target.value)} />
                </label>
                <label className="field">Latitude
                  <input className="input" inputMode="decimal" value={row.latitude} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "latitude", event.target.value)} />
                </label>
                <label className="field">Longitude
                  <input className="input" inputMode="decimal" value={row.longitude} disabled={committed || geocodingRowNumber === row.rowNumber} onChange={(event) => updateRow(row.rowNumber, "longitude", event.target.value)} />
                </label>
              </div>
              {locationFeedback?.rowNumber === row.rowNumber && <p className={locationFeedback.success ? "location-feedback success" : "location-feedback error"} role={locationFeedback.success ? "status" : "alert"}>{locationFeedback.message}</p>}
            </section>
            <div className="import-edit-grid">
              <PositionField rowNumber={row.rowNumber} value={row.positionTitle} suggestions={positionSuggestions} disabled={committed} onChange={(value) => updateRow(row.rowNumber, "positionTitle", value)} />
              {editableFields.map(({ key, label, multiline }) => <label className="field" key={key}>{label}{multiline
                ? <textarea className="input" rows={key === "advisorRecommendation" || key === "jobDescription" ? 3 : 2} value={row[key]} disabled={committed} onChange={(event) => updateRow(row.rowNumber, key, event.target.value)} />
                : <input className="input" value={row[key]} disabled={committed} onChange={(event) => updateRow(row.rowNumber, key, event.target.value)} />}</label>)}
            </div>
            <div className="form-actions"><button className="button secondary" type="button" onClick={() => setEditingRowNumber(undefined)}>เสร็จสิ้นการแก้ไข</button></div>
          </td></tr>}
        </Fragment>)}</tbody></table></div>
        {commitMessage && <div className="notice success-notice" role="status"><span aria-hidden="true">✓</span> {commitMessage}</div>}
        {preview.summary.valid > 0 && <button className="button commit-button" disabled={committing || classifying || classificationDirty || committed || !originalFile} onClick={commitImport}>{committing ? `กำลังนำเข้า ${preview.summary.valid} รายการ...` : committed ? "นำเข้าเสร็จแล้ว" : `บันทึกรายการใหม่ที่พร้อมนำเข้า (${preview.summary.valid} รายการ)`}</button>}
      </div>
    </section>}
  </main>;
}
