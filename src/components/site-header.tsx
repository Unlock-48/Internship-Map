"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [logoUrl, setLogoUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    fetch(`/api/site-settings?t=${Date.now()}`, { cache: "no-store" }).then((response) => response.json()).then((payload: { logoUrl?: string }) => setLogoUrl(payload.logoUrl ?? "")).catch(() => undefined);
    fetch("/api/admin/session", { cache: "no-store" }).then((response) => response.json()).then((payload: { authenticated?: boolean }) => setIsAdmin(payload.authenticated === true)).catch(() => setIsAdmin(false));
    const savedTheme = window.localStorage.getItem("site-theme");
    const initialTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);
  function changeTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    window.localStorage.setItem("site-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }
  return <header className="topbar">
    <Link className="brand" href="/">
      {logoUrl ? <img className="brand-logo" src={logoUrl} alt="โลโก้เว็บไซต์" /> : <span className="brand-mark">CM</span>}
      <span>Chiang Mai Internship Map</span>
    </Link>
    <nav className="nav"><Link href="/submit">เสนอข้อมูล</Link><Link href="/report">แจ้งข้อมูลผิด</Link><button className={`theme-option ${theme === "dark" ? "active" : ""}`} type="button" onClick={() => changeTheme("dark")} aria-pressed={theme === "dark"}>โหมดมืด</button><button className={`theme-option ${theme === "light" ? "active" : ""}`} type="button" onClick={() => changeTheme("light")} aria-pressed={theme === "light"}>โหมดสว่าง</button><Link href="/admin">{isAdmin ? "Admin" : "Login"}</Link></nav>
  </header>;
}
