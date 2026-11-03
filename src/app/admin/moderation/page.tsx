"use client";

import { useEffect, useState } from "react";

type QueueItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  companies: { id: string; name: string; status: string; district: string };
};

export default function ModerationPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/moderation");
    const payload = await response.json() as { data?: QueueItem[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "โหลดข้อมูลไม่สำเร็จ");
    setItems(payload.data ?? []);
  }

  useEffect(() => { load().catch((reason: Error) => setError(reason.message)); }, []);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/admin/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ internshipId: id, action }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ดำเนินการไม่สำเร็จ");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function approveAll() {
    if (!items.length || !window.confirm(`ยืนยันอนุมัติข้อมูลทั้งหมด ${items.length} รายการหรือไม่?`)) return;
    setBulkBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, action: "approve" })
      });
      const payload = await response.json() as { count?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "อนุมัติข้อมูลทั้งหมดไม่สำเร็จ");
      setItems([]);
      setError("");
      window.alert(`อนุมัติข้อมูลสำเร็จ ${payload.count ?? 0} รายการ`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "อนุมัติข้อมูลทั้งหมดไม่สำเร็จ");
    } finally {
      setBulkBusy(false);
    }
  }

  return <main className="page moderation-page"><div className="moderation-header"><div><h1>คิวตรวจสอบข้อมูล</h1><p>ตรวจสอบข้อมูลที่นำเข้าจาก Excel ก่อนเผยแพร่สู่เว็บไซต์</p></div><button className="button approve-all" disabled={!items.length || bulkBusy || Boolean(busy)} onClick={approveAll}>{bulkBusy ? "กำลังอนุมัติ..." : `อนุมัติทั้งหมด (${items.length})`}</button></div>{error && <div className="notice" role="alert">{error}</div>}<div className="moderation-list">{items.map((item) => <article className="moderation-card" key={item.id}><div><h2>{item.companies.name}</h2><p><strong>ตำแหน่ง:</strong> {item.title}</p><p><strong>พื้นที่:</strong> {item.companies.district || "ไม่ระบุ"} · <strong>สถานะ:</strong> {item.status}</p></div><div className="moderation-actions"><button className="button" disabled={busy === item.id || bulkBusy} onClick={() => act(item.id, "approve")}>อนุมัติ</button><button className="button danger" disabled={busy === item.id || bulkBusy} onClick={() => act(item.id, "reject")}>ไม่อนุมัติ</button></div></article>)}{!items.length && !error && <div className="notice">ไม่มีรายการรอตรวจสอบ</div>}</div></main>;
}
