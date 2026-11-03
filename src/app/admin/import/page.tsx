"use client";

import { ChangeEvent, useState } from "react";
import type { ImportRow } from "@/lib/import-workbook";

type Preview = {
  fileName: string;
  headers: string[];
  rows: ImportRow[];
  summary: { total: number; valid: number; invalid: number };
};

export default function ImportPage() {
  const [preview, setPreview] = useState<Preview>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [committed, setCommitted] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setUploadMessage("");
    setCommitMessage("");
    setCommitted(false);
    setPreview(undefined);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/admin/import/preview", { method: "POST", body: formData });
      const payload = await response.json() as Preview & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "อ่านไฟล์ไม่สำเร็จ");
      setPreview(payload);
      setUploadMessage(`อัปโหลดไฟล์สำเร็จ: ${file.name} · พบข้อมูล ${payload.summary.total} แถว`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "อ่านไฟล์ไม่สำเร็จ");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function commitImport() {
    if (!preview || preview.summary.valid === 0) return;
    setCommitting(true);
    setCommitMessage("");
    try {
      const response = await fetch("/api/admin/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows.filter((row) => row.errors.length === 0) })
      });
      const payload = await response.json() as { imported?: number; updated?: number; skipped?: number; processed?: number; total?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "นำเข้าข้อมูลไม่สำเร็จ");
      const processed = payload.processed ?? 0;
      const total = payload.total ?? preview.summary.valid;
      setCommitted(true);
      setCommitMessage(`ดำเนินการเสร็จสมบูรณ์ · ตรวจสอบแล้ว ${processed}/${total} แถว · เพิ่มใหม่ ${payload.imported ?? 0} · อัปเดตเดิม ${payload.updated ?? 0} · ไม่เปลี่ยนแปลง ${payload.skipped ?? 0}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "นำเข้าข้อมูลไม่สำเร็จ");
    } finally {
      setCommitting(false);
    }
  }

  const filePicker = <input type="file" accept=".xlsx" onChange={upload} disabled={loading} />;

  return <main className="page import-page">
    <div className="import-header">
      <div>
        <p className="eyebrow">ADMIN DATA CENTER</p>
        <h1>นำเข้าข้อมูลจาก Excel</h1>
        <p className="page-description">อัปโหลด ตรวจสอบ และบันทึกข้อมูลสถานประกอบการเข้าสู่ระบบ</p>
      </div>
      {preview && <label className="button upload-button">อัปโหลดไฟล์ใหม่{filePicker}</label>}
    </div>
    {loading && <div className="upload-progress" role="status"><span className="loading-dot" />กำลังอ่านไฟล์และเตรียมข้อมูล...</div>}
    {error && <div className="notice" role="alert">{error}</div>}
    {uploadMessage && <div className="notice success-notice" role="status"><span aria-hidden="true">✓</span> {uploadMessage}</div>}
    {!preview && <section className="upload-hero">
      <div className="upload-icon" aria-hidden="true">↑</div>
      <h2>เริ่มต้นด้วยการอัปโหลดไฟล์</h2>
      <p>รองรับไฟล์ Excel นามสกุล .xlsx ข้อมูลที่ไม่ครบสามารถนำเข้าได้ และจะแสดงเป็น “ไม่ระบุ”</p>
      <label className="button upload-primary">เลือกไฟล์ Excel{filePicker}</label>
      <small>ขนาดไฟล์ไม่เกิน 10 MB</small>
    </section>}
    {preview && <section className="import-results">
      <div className="import-summary">
        <div className="result-heading"><div><p className="eyebrow">PREVIEW RESULT</p><h2>{preview.fileName}</h2></div><span className="file-status">พร้อมตรวจสอบ</span></div>
        <div className="admin-grid"><div className="metric">ทั้งหมด<strong>{preview.summary.total}</strong><small>แถวในไฟล์</small></div><div className="metric metric-valid">พร้อมนำเข้า<strong>{preview.summary.valid}</strong><small>รายการ</small></div><div className="metric metric-invalid">ข้อมูลไม่ครบ<strong>{preview.summary.invalid}</strong><small>รายการ</small></div></div>
        <div className="table-heading"><h3>ตัวอย่างข้อมูล</h3><span>แสดง {preview.rows.length} แถว</span></div>
        <div className="table-wrap"><table><thead><tr><th>แถว</th><th>บริษัท</th><th>ประเภทกิจการ</th><th>ตำแหน่ง</th><th>ที่อยู่</th><th>สถานะ</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.companyName || "ไม่ระบุ"}</td><td>{row.businessType || "ไม่ระบุ"}</td><td>{row.positionTitle || "ไม่ระบุ"}</td><td>{row.address || "ไม่ระบุ"}</td><td className={row.errors.length ? "invalid-cell" : "valid-cell"}>{row.errors.length ? row.errors.join(", ") : "พร้อมนำเข้า"}</td></tr>)}</tbody></table></div>
        {commitMessage && <div className="notice success-notice" role="status"><span aria-hidden="true">✓</span> {commitMessage}</div>}
        {preview.summary.valid > 0 && <button className="button commit-button" disabled={committing || committed} onClick={commitImport}>{committing ? `กำลังนำเข้า ${preview.summary.valid} รายการ...` : committed ? "นำเข้าเสร็จแล้ว" : `บันทึกข้อมูลที่พร้อมนำเข้า (${preview.summary.valid} รายการ)`}</button>}
      </div>
      <aside className="upload-side">
        <div className="upload-side-icon" aria-hidden="true">↑</div>
        <h3>นำเข้าไฟล์อื่น</h3>
        <p>อัปโหลดไฟล์ใหม่เพื่อแทนที่ Preview ปัจจุบัน</p>
        <label className="upload-box">เลือกไฟล์ .xlsx{filePicker}</label>
      </aside>
    </section>}
  </main>;
}
