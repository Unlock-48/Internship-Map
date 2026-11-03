# Chiang Mai Internship Map

เว็บแอปสำหรับค้นหาสถานที่ฝึกงานในจังหวัดเชียงใหม่ตาม `main-master-prompt.md` และ `ไฟล์ก่อนแก้ไขprompt.txt`

## สิ่งที่มีใน MVP

- Public search พร้อม filter Onsite / Hybrid / Remote
- Split-screen list + map พร้อมพฤติกรรมไม่แสดง Remote เป็นหมุด
- หน้ารายละเอียดประกาศ
- Anonymous submission และ report forms
- Admin dashboard placeholder สำหรับต่อ Supabase Auth/Moderation
- API `GET /api/internships?q=...&workMode=hybrid`
- PostgreSQL/PostGIS schema, constraints, spatial/search indexes และ RLS

## เริ่มต้นใช้งาน

```bash
npm install
copy .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000`

## ต่อฐานข้อมูล

1. สร้าง Supabase project
2. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. รัน [001_initial_schema.sql](./supabase/migrations/001_initial_schema.sql) ผ่าน Supabase SQL Editor
4. เมื่อมี schema แล้ว หน้า Public จะอ่านข้อมูลจาก Supabase อัตโนมัติ
5. ฟอร์มเสนอข้อมูลและแจ้งข้อมูลผิดจะบันทึกลง Supabase อัตโนมัติ
6. เพิ่ม Supabase Auth สำหรับ Admin โดยปิด Public Sign-up

การยืนยันนำเข้า Excel ต้องใช้ `SUPABASE_SERVICE_ROLE_KEY` เฉพาะฝั่ง Server เท่านั้น ห้ามใช้ใน Client หรือ commit ค่า secret ลง Git

Admin ใช้ `ADMIN_EMAIL` จำกัดอีเมลผู้ดูแลเพียงบัญชีเดียว และต้องสร้างบัญชีนี้ใน Supabase Authentication ก่อนใช้งาน

ก่อนใส่ environment variables ระบบจะใช้ข้อมูลตัวอย่างเพื่อให้พัฒนา UI ต่อได้ และจะแสดง `ข้อมูลจาก Supabase` เมื่อเชื่อมต่อสำเร็จ

> Free Tier / Open-source ไม่ได้แปลว่ามี SLA หรือรับประกัน Production availability

## โครงสร้าง

- `src/app`: หน้าจอและ API routes
- `src/components`: UI components
- `src/lib`: data/search/domain helpers
- `src/types`: TypeScript domain types
- `supabase/migrations`: schema และ security baseline
