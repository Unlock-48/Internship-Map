alter table public.companies
  add column if not exists organization_type text not null default 'ไม่ระบุ';

alter table public.internships
  add column if not exists job_category text not null default 'ไม่ระบุ';

update public.companies
set organization_type = case
  when lower(coalesce(business_type, '')) = 'software house' then 'Software House'
  when lower(coalesce(business_type, '')) = 'หน่วยงานรัฐ' then 'ภาครัฐ'
  when lower(coalesce(business_type, '')) like '%รัฐวิสาหกิจ%' then 'ภาคเอกชน'
  when coalesce(business_type, '') <> '' then 'ภาคเอกชน'
  else 'ไม่ระบุ'
end
where organization_type = 'ไม่ระบุ';

update public.internships
set job_category = case
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'program|software|developer|programmer|web|front.?end|back.?end|full.?stack|นักพัฒนา|โปรแกรม|พัฒนาเว็บไซต์|ซอฟต์แวร์' then 'พัฒนาซอฟต์แวร์'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'support|helpdesk|it support|ซ่อม|ดูแลระบบ|ไอที' then 'IT Support'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'network|เครือข่าย|fiber|cctv|server|โครงสร้างพื้นฐาน' then 'เครือข่ายและโครงสร้าง'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'graphic|design|กราฟิก|ออกแบบ|video|วิดีโอ|animation|สื่อ' then 'ออกแบบกราฟิกมัลติมีเดีย'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'data|ข้อมูล|ai|ปัญญาประดิษฐ์|วิเคราะห์' then 'ข้อมูลและปัญญาประดิษฐ์'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'marketing|content|การตลาด|คอนเทนต์|ประชาสัมพันธ์' then 'การตลาดและคอนเทนต์'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'hr|human resource|ทรัพยากรบุคคล|บุคคล|ธุรการ' then 'ธุรการและทรัพยากรบุคคล'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'account|บัญชี|การเงิน|finance' then 'บัญชีและการเงิน'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'sales|ขาย|ลูกค้า|บริการ' then 'ขายและบริการลูกค้า'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'ช่าง|วิศว|technician|technical' then 'ช่างเทคนิคและวิศวกรรม'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'ขนส่ง|โลจิสติกส์|logistic|transport' then 'ขนส่งและโลจิสติกส์'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) ~ 'โรงแรม|บริการ|hotel' then 'งานโรงแรมและบริการ'
  else 'ไม่ระบุ'
end
where job_category = 'ไม่ระบุ';
