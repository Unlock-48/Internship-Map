import Link from "next/link";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Chiang Mai Internship Map", description: "แผนที่ค้นหาสถานที่ฝึกงานจังหวัดเชียงใหม่" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
      <SiteHeader />
      {children}
      </body>
    </html>
  );
}
