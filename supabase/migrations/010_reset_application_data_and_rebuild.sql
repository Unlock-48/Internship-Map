-- DESTRUCTIVE RESET:
-- This migration deletes all application data from the listed public tables.
-- Supabase Auth users, Storage buckets/objects, extensions, and enum types remain.

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

drop table if exists
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
cascade;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text unique not null,
  short_name text,
  province text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_units (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  parent_id uuid references public.academic_units(id) on delete set null,
  code text not null,
  name text not null,
  unit_type text not null check (unit_type in ('campus', 'faculty', 'department', 'program', 'other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, code),
  unique (university_id, parent_id, name)
);

create index academic_units_university_parent_active
  on public.academic_units(university_id, parent_id, is_active);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  business_type text,
  organization_type text not null default 'ไม่ระบุ',
  description text,
  address text not null default 'ไม่ระบุ',
  district text not null default 'ไม่ระบุ',
  province text not null default 'เชียงใหม่',
  postal_code text,
  latitude numeric(10,8) check (latitude between -90 and 90),
  longitude numeric(11,8) check (longitude between -180 and 180),
  location geography(point,4326) generated always as (
    case
      when latitude is null or longitude is null then null
      else st_point(longitude, latitude)::geography
    end
  ) stored,
  website text,
  google_maps_url text,
  facebook text,
  phone text,
  email text,
  logo_url text,
  coordinator_name text,
  coordinator_title text,
  coordinator_phone text,
  authorized_name text,
  authorized_title text,
  business_hours text,
  advisor_recommendation text,
  advisor_name text,
  status public.company_status not null default 'inactive',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_location_gist on public.companies using gist(location);
create index companies_name_trgm on public.companies using gin(name gin_trgm_ops);
create index companies_province_status on public.companies(province, status);

create table public.internships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  academic_unit_id uuid references public.academic_units(id) on delete set null,
  title text not null,
  job_category text not null default 'ไม่ระบุ',
  description text not null default 'ไม่ระบุ',
  qualifications text,
  work_mode public.work_mode not null default 'undisclosed',
  work_location_note text,
  allowance_type public.allowance_type not null default 'undisclosed',
  allowance_min numeric(10,2) check (allowance_min is null or allowance_min >= 0),
  allowance_max numeric(10,2) check (allowance_max is null or allowance_max >= allowance_min),
  allowance_period text not null default 'monthly',
  openings_count integer check (openings_count is null or openings_count >= 0),
  application_start_date date,
  application_end_date date check (
    application_end_date is null
    or application_start_date is null
    or application_end_date >= application_start_date
  ),
  application_link text,
  application_method text,
  status public.internship_status not null default 'draft',
  all_universities boolean not null default false,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index internships_company_status on public.internships(company_id, status);
create index internships_academic_unit_status on public.internships(academic_unit_id, status);
create index internships_search on public.internships using gin(to_tsvector('simple', title || ' ' || description));

create or replace function public.set_default_internship_academic_unit()
returns trigger
language plpgsql
as $$
begin
  if new.academic_unit_id is null then
    select academic_units.id
      into new.academic_unit_id
    from public.academic_units
    join public.universities on universities.id = academic_units.university_id
    where universities.code = 'CMRU'
      and academic_units.code = 'COMSCI'
      and academic_units.is_active = true
    limit 1;
  end if;
  return new;
end;
$$;

create trigger internships_default_academic_unit
before insert on public.internships
for each row execute function public.set_default_internship_academic_unit();

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  is_active boolean not null default true
);

create table public.internship_positions (
  internship_id uuid not null references public.internships(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  primary key (internship_id, position_id)
);

create table public.internship_eligible_units (
  internship_id uuid not null references public.internships(id) on delete cascade,
  academic_unit_id uuid not null references public.academic_units(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (internship_id, academic_unit_id)
);

create table public.internship_universities (
  internship_id uuid not null references public.internships(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  primary key (internship_id, university_id)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  academic_unit_id uuid not null references public.academic_units(id) on delete restrict,
  file_name text not null,
  storage_path text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  file_sha256 text,
  status text not null default 'completed' check (status in ('processing', 'completed', 'completed_with_errors', 'failed', 'rolled_back')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  updated_rows integer not null default 0 check (updated_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index import_batches_unit_created on public.import_batches(academic_unit_id, created_at desc);

create table public.import_batch_rows (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_row_number integer not null check (source_row_number > 0),
  outcome text not null check (outcome in ('imported', 'updated', 'skipped', 'error')),
  source_data jsonb not null default '{}'::jsonb,
  message text,
  internship_id uuid references public.internships(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, source_row_number)
);

create table public.opportunity_sources (
  id bigint generated always as identity primary key,
  internship_id uuid not null references public.internships(id) on delete cascade,
  academic_unit_id uuid not null references public.academic_units(id) on delete restrict,
  batch_id uuid references public.import_batches(id) on delete set null,
  source_row_number integer,
  created_at timestamptz not null default now(),
  unique (batch_id, source_row_number)
);

create index opportunity_sources_unit on public.opportunity_sources(academic_unit_id);
create unique index opportunity_sources_manual_unique
  on public.opportunity_sources(internship_id, academic_unit_id)
  where batch_id is null;

create table public.category_options (
  id uuid primary key default gen_random_uuid(),
  category_type text not null check (category_type in ('organization_type', 'business_type')),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_type, name)
);

create table public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_company', 'new_internship', 'correction')),
  status public.submission_status not null default 'pending',
  payload jsonb not null,
  source_url text,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index submissions_status_created on public.submissions(status, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  internship_id uuid references public.internships(id) on delete set null,
  reason text not null,
  details text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

insert into public.universities (code, name, short_name, province)
values ('CMRU', 'มหาวิทยาลัยราชภัฏเชียงใหม่', 'มรภ.เชียงใหม่', 'เชียงใหม่');

insert into public.academic_units (university_id, code, name, unit_type)
select id, 'COMSCI', 'ภาควิชาวิทยาการคอมพิวเตอร์', 'department'
from public.universities
where code = 'CMRU';

insert into public.category_options (category_type, name)
values
  ('organization_type', 'ไม่ระบุ'),
  ('organization_type', 'ภาคเอกชน'),
  ('organization_type', 'ภาครัฐ'),
  ('organization_type', 'Software House');

alter table public.companies enable row level security;
alter table public.internships enable row level security;
alter table public.universities enable row level security;
alter table public.academic_units enable row level security;
alter table public.positions enable row level security;
alter table public.internship_positions enable row level security;
alter table public.internship_universities enable row level security;
alter table public.internship_eligible_units enable row level security;
alter table public.category_options enable row level security;
alter table public.site_settings enable row level security;
alter table public.submissions enable row level security;
alter table public.reports enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_batch_rows enable row level security;
alter table public.opportunity_sources enable row level security;
alter table public.audit_logs enable row level security;

create policy "public reads active companies" on public.companies
  for select using (status = 'active');
create policy "public reads open internships" on public.internships
  for select using (status = 'open');
create policy "public reads active universities" on public.universities
  for select using (is_active = true);
create policy "public reads active academic units" on public.academic_units
  for select using (is_active = true);
create policy "public reads active positions" on public.positions
  for select using (is_active = true);
create policy "public reads positions for open internships" on public.internship_positions
  for select using (
    exists (
      select 1 from public.internships
      where internships.id = internship_positions.internship_id
        and internships.status = 'open'
    )
  );
create policy "public reads universities for open internships" on public.internship_universities
  for select using (
    exists (
      select 1 from public.internships
      where internships.id = internship_universities.internship_id
        and internships.status = 'open'
    )
  );
create policy "public reads active category options" on public.category_options
  for select using (is_active = true);
create policy "public reads eligible units for open internships" on public.internship_eligible_units
  for select using (
    exists (
      select 1 from public.internships
      where internships.id = internship_eligible_units.internship_id
        and internships.status = 'open'
    )
  );
create policy "public creates submissions" on public.submissions
  for insert with check (status = 'pending');
create policy "public creates reports" on public.reports
  for insert with check (status = 'pending');
