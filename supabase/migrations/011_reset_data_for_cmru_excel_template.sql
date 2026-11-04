-- DESTRUCTIVE DATA RESET:
-- Removes all application rows while preserving Auth users, application table
-- definitions, Storage buckets, and Storage objects.
-- Storage objects must be removed separately through the Supabase Storage API.
-- Migration 010 already created the normalized schema used by the Excel import flow.

begin;

truncate table
  public.internship_eligible_units,
  public.opportunity_sources,
  public.import_batch_rows,
  public.import_batches,
  public.internship_universities,
  public.internship_positions,
  public.positions,
  public.academic_units,
  public.universities,
  public.category_options,
  public.site_settings,
  public.reports,
  public.submissions,
  public.audit_logs,
  public.internships,
  public.companies
restart identity cascade;

insert into public.universities (code, name, short_name, province)
values ('CMRU', 'มหาวิทยาลัยราชภัฏเชียงใหม่', 'มรภ.เชียงใหม่', 'เชียงใหม่');

insert into public.academic_units (university_id, code, name, unit_type)
select id, 'COMSCI', 'ภาควิชาคอมพิเตอร์', 'department'
from public.universities
where code = 'CMRU';

insert into public.category_options (category_type, name)
values
  ('organization_type', 'ไม่ระบุ'),
  ('organization_type', 'ภาคเอกชน'),
  ('organization_type', 'ภาครัฐ'),
  ('organization_type', 'Software House');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'internship-imports',
  'internship-imports',
  false,
  10485760,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;
