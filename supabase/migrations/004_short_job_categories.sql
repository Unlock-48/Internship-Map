update public.internships
set job_category = case job_category
  when 'เครือข่ายและโครงสร้างพื้นฐาน' then 'เครือข่ายและโครงสร้าง'
  when 'ออกแบบกราฟิกและมัลติมีเดีย' then 'ออกแบบกราฟิกมัลติมีเดีย'
  else job_category
end
where job_category in ('เครือข่ายและโครงสร้างพื้นฐาน', 'ออกแบบกราฟิกและมัลติมีเดีย');
