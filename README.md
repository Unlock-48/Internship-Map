# Chiang Mai Internship Map

เว็บแอปพลิเคชันสำหรับค้นหาและจัดการสถานที่ฝึกงานในจังหวัดเชียงใหม่ พัฒนาขึ้นเพื่อใช้เป็นโปรเจกต์ศึกษาเกี่ยวกับการสร้างเว็บแอปแบบ Full-stack ที่เชื่อมต่อฐานข้อมูลจริง มีระบบแผนที่ การค้นหา การนำเข้าข้อมูล และระบบผู้ดูแลระบบ

## วัตถุประสงค์ของโครงการ

- ศึกษาการพัฒนาเว็บด้วย Next.js และ TypeScript
- ศึกษาการออกแบบ API และการเชื่อมต่อฐานข้อมูล PostgreSQL
- ศึกษาการใช้ Supabase Authentication, Storage และ Row Level Security
- ศึกษาการจัดเก็บและแสดงพิกัดด้วย PostGIS
- สร้างศูนย์กลางข้อมูลสถานที่ฝึกงานสำหรับนักศึกษา
- รองรับการมีส่วนร่วมจากผู้ใช้ผ่านการเสนอข้อมูลและแจ้งข้อมูลผิด

## ฟีเจอร์หลัก

### ผู้ใช้งานทั่วไป

- ค้นหาบริษัท ตำแหน่งงาน และพื้นที่
- กรองตามประเภทหน่วยงาน
- กรองตามลักษณะงาน
- แสดงบริษัทบนแผนที่ OpenStreetMap
- แสดงหมุดตามประเภทหน่วยงาน
  - ไม่ระบุ: สีเทา
  - ภาคเอกชน: สีฟ้า
  - ภาครัฐ: สีเหลือง
  - Software House: สีแดง
- คลิกการ์ดบริษัทเพื่อเลื่อนไปยังหมุดบนแผนที่
- ดูรายละเอียดบริษัทและตำแหน่งฝึกงาน
- ส่งข้อมูลฝึกงานใหม่
- แจ้งข้อมูลผิดหรือข้อมูลหมดอายุ

### ผู้ดูแลระบบ

- Login ด้วย Supabase Auth
- เพิ่ม แก้ไข และลบบริษัท
- แก้ไขข้อมูลจากหน้า Admin หรือหน้ารายละเอียดงาน
- แก้ไขข้อมูลบริษัท ผู้ประสานงาน ผู้มีอำนาจลงนาม และคำแนะนำอาจารย์
- แก้ไข Latitude, Longitude และลิงก์ Google Maps
- ดึงพิกัดจากลิงก์ Google Maps
- นำเข้าข้อมูลจาก Excel
- อัปเดตข้อมูลเดิมโดยใช้รหัสบริษัทหรือข้อมูลอ้างอิง
- ค้นหาและกรองบริษัทที่ยังไม่มีพิกัดหรือไม่มี Google Maps
- จัดการประเภทหน่วยงานและประเภทกิจการ
- อัปโหลดโลโก้เว็บไซต์
- ตรวจสอบกล่องจดหมาย
  - เสนอข้อมูล
  - แจ้งข้อมูลผิด
  - กรองประเภทข้อความ
  - เปิดดูรายละเอียดแบบขยาย/ย่อ
  - ทำเครื่องหมายเสร็จแล้ว
  - ทำเครื่องหมายข้อมูลผิด

## เทคโนโลยีที่ใช้

- Next.js 14 App Router
- React 18
- TypeScript แบบ Strict
- Supabase
  - PostgreSQL
  - Supabase Auth
  - Supabase Storage
  - Row Level Security
- PostGIS
- Leaflet และ OpenStreetMap
- Zod สำหรับตรวจสอบข้อมูล
- XLSX สำหรับอ่านไฟล์ Excel
- Vercel สำหรับ Deploy ได้

## โครงสร้างโปรเจกต์

```text
src/
├── app/
│   ├── admin/                 หน้า Admin และระบบ Login
│   ├── api/                   API Routes
│   ├── internships/[id]/      หน้ารายละเอียดงาน
│   ├── report/                หน้าแจ้งข้อมูลผิด
│   ├── submit/                หน้าเสนอข้อมูลฝึกงาน
│   ├── globals.css            Styles หลัก
│   └── page.tsx               หน้าแรกและระบบค้นหา
├── components/
│   ├── map-view.tsx            แผนที่และหมุดบริษัท
│   └── site-header.tsx         Header และสถานะ Admin
├── lib/
│   ├── google-maps.ts          อ่านพิกัดจาก Google Maps URL
│   ├── import-workbook.ts      อ่านและแปลงข้อมูล Excel
│   ├── job-category.ts         หมวดลักษณะงาน
│   ├── organization-type.ts    ประเภทหน่วยงาน
│   └── supabase/               Supabase clients
└── types/
    └── domain.ts               Domain types

supabase/
└── migrations/                 SQL schema และการปรับปรุงฐานข้อมูล
```

## การติดตั้งสำหรับการศึกษา

### ความต้องการเบื้องต้น

- Node.js 18 ขึ้นไป
- npm
- บัญชี Supabase
- Git

### ติดตั้ง Dependencies

```bash
npm install
```

### ตั้งค่า Environment Variables

คัดลอกไฟล์ตัวอย่าง:

```powershell
copy .env.example .env.local
```

แก้ไข `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
```

คำอธิบาย:

- `NEXT_PUBLIC_SUPABASE_URL`: URL ของ Supabase Project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: คีย์สำหรับฝั่ง Client
- `SUPABASE_SERVICE_ROLE_KEY`: คีย์สำหรับ Server เท่านั้น
- `ADMIN_EMAIL`: อีเมลที่ได้รับสิทธิ์ Admin

ห้ามเผยแพร่ `.env.local` หรือ `SUPABASE_SERVICE_ROLE_KEY` ลง GitHub

### รันฐานข้อมูล

เปิด Supabase Dashboard > SQL Editor แล้วรัน Migration ตามลำดับ:

```text
001_initial_schema.sql
002_company_detail_fields.sql
003_organization_type.sql
004_short_job_categories.sql
005_short_software_category.sql
006_site_settings.sql
007_category_options.sql
008_import_existing_business_categories.sql
```

ไฟล์ `008_import_existing_business_categories.sql` จะดึงประเภทกิจการเดิมจากตาราง `companies` มาเติมในระบบหมวดหมู่

### สร้างบัญชี Admin

1. เปิด Supabase Dashboard
2. ไปที่ Authentication > Users
3. สร้างผู้ใช้ด้วยอีเมลเดียวกับ `ADMIN_EMAIL`
4. Login ที่ `/admin/login`

### เริ่มเซิร์ฟเวอร์สำหรับพัฒนา

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## คำสั่งตรวจสอบ

```bash
npm run typecheck
npm run build
```

## การ Deploy ด้วย Vercel

1. Push โปรเจกต์ไป GitHub
2. เปิด Vercel และเลือก Import Repository
3. เลือก Framework เป็น Next.js
4. เพิ่ม Environment Variables ชุดเดียวกับ `.env.local`
5. Deploy

ต้องเพิ่ม Environment Variables ใน Environment ของ Vercel ให้ครบทั้ง Preview และ Production ตามที่ต้องการ

## ความปลอดภัย

- ไม่เก็บ Secret Key ใน Client
- `.env.local` ถูกกันออกจาก Git ด้วย `.gitignore`
- API ฝั่ง Admin ตรวจสอบสิทธิ์ซ้ำที่ Server
- การแก้ไขข้อมูลบริษัทต้องผ่าน Admin Authentication
- ใช้ Supabase RLS สำหรับตารางสาธารณะ
- Public สามารถสร้างรายงานและเสนอข้อมูลได้ แต่ไม่สามารถอ่านหรือแก้ไขข้อมูล Admin
- Service Role Key ใช้เฉพาะใน Server-side API Routes

## แนวคิดการจัดเก็บข้อมูล

ตารางสำคัญ:

- `companies`: ข้อมูลบริษัท สถานที่ พิกัด และผู้ประสานงาน
- `internships`: ตำแหน่งฝึกงานและรายละเอียดงาน
- `reports`: รายงานข้อมูลผิดจากผู้ใช้งาน
- `submissions`: ข้อมูลฝึกงานที่ผู้ใช้เสนอ
- `category_options`: ตัวเลือกประเภทหน่วยงานและประเภทกิจการ
- `audit_logs`: ประวัติการดำเนินการของ Admin
- `site_settings`: การตั้งค่าเว็บไซต์ เช่น โลโก้

พิกัดบริษัทใช้ระบบพิกัด WGS84 (`SRID 4326`) ผ่าน PostGIS ซึ่งเป็นมาตรฐานเดียวกับ GPS และ Google Maps

## การนำเข้า Excel

ระบบรองรับการ Preview และ Commit ข้อมูล Excel ผ่านหน้า Admin:

1. เปิดหน้า Admin > Import
2. อัปโหลดไฟล์ `.xlsx`
3. ตรวจสอบข้อมูลและข้อผิดพลาด
4. กดยืนยันนำเข้า

ระบบพยายามจับคู่ข้อมูลเดิมด้วย:

1. รหัสบริษัทจากไฟล์
2. ชื่อบริษัทและพื้นที่

ข้อมูลที่มีค่าใหม่จะถูกอัปเดต ส่วนช่องว่างจะไม่เขียนทับข้อมูลเดิม

## ข้อจำกัดของ Supabase Free

สำหรับข้อมูลข้อความบริษัทและฝึกงานระดับประมาณ 1,000 รายการ โดยทั่วไปถือว่าเพียงพอ เพราะใช้พื้นที่น้อยเมื่อเทียบกับฐานข้อมูลที่ให้มา

ควรติดตาม:

- พื้นที่ฐานข้อมูล
- พื้นที่ Storage โดยเฉพาะรูปภาพ
- Bandwidth
- การสำรองข้อมูล
- การพักโปรเจกต์เมื่อไม่มีการใช้งานเป็นเวลานาน

## แนวทางพัฒนาต่อ

- เพิ่มระบบแบ่งหน้าใน Admin และกล่องจดหมาย
- เพิ่มการกำหนดสิทธิ์ Admin หลายระดับ
- เพิ่มระบบแจ้งเตือนอีเมลเมื่อมีข้อความใหม่
- เพิ่มระบบประวัติการแก้ไขข้อมูลแบบละเอียด
- เพิ่มการตรวจสอบพิกัดก่อนเผยแพร่
- เพิ่ม Automated Tests
- เพิ่มการวัดประสิทธิภาพและ Monitoring
- เพิ่มระบบนำเข้ารูปภาพบริษัท

## ลิขสิทธิ์และการใช้งาน

โปรเจกต์นี้จัดทำขึ้นเพื่อการศึกษาและพัฒนาระบบต้นแบบ ผู้พัฒนาควรตรวจสอบใบอนุญาตและข้อกำหนดการใช้งานของบริการภายนอก เช่น Supabase, OpenStreetMap และไลบรารีต่าง ๆ ก่อนนำไปใช้ในเชิงพาณิชย์
