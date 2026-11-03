create extension if not exists postgis;
create extension if not exists pg_trgm;

create type public.company_status as enum ('active', 'inactive', 'archived');
create type public.work_mode as enum ('onsite', 'hybrid', 'remote', 'undisclosed');
create type public.allowance_type as enum ('fixed', 'range', 'unpaid', 'negotiable', 'undisclosed');
create type public.internship_status as enum ('draft', 'open', 'closed', 'expired', 'archived');
create type public.submission_status as enum ('pending', 'reviewing', 'approved', 'rejected', 'needs_changes');

create table public.companies (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  business_type text, description text, address text not null, district text not null,
  province text not null default 'เชียงใหม่', postal_code text,
  latitude numeric(10,8) check (latitude between -90 and 90),
  longitude numeric(11,8) check (longitude between -180 and 180),
  location geography(point,4326) generated always as (st_point(longitude, latitude)::geography) stored,
  website text, google_maps_url text, facebook text, phone text, email text, logo_url text,
  coordinator_name text, coordinator_title text, coordinator_phone text,
  authorized_name text, authorized_title text, business_hours text,
  advisor_recommendation text, advisor_name text,
  status public.company_status not null default 'active',
  last_verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index companies_location_gist on public.companies using gist(location);
create index companies_name_trgm on public.companies using gin(name gin_trgm_ops);

create table public.internships (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  title text not null, description text not null, qualifications text,
  work_mode public.work_mode not null default 'undisclosed', work_location_note text,
  allowance_type public.allowance_type not null default 'undisclosed',
  allowance_min numeric(10,2) check (allowance_min is null or allowance_min >= 0),
  allowance_max numeric(10,2) check (allowance_max is null or allowance_max >= allowance_min),
  allowance_period text not null default 'monthly', openings_count integer check (openings_count is null or openings_count >= 0),
  application_start_date date, application_end_date date check (application_end_date is null or application_start_date is null or application_end_date >= application_start_date),
  application_link text, application_method text, status public.internship_status not null default 'draft',
  all_universities boolean not null default false, last_verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index internships_company_status on public.internships(company_id, status);
create index internships_search on public.internships using gin(to_tsvector('simple', title || ' ' || description));

create table public.positions (id uuid primary key default gen_random_uuid(), name text unique not null, slug text unique not null, is_active boolean not null default true);
create table public.internship_positions (internship_id uuid references public.internships(id) on delete cascade, position_id uuid references public.positions(id) on delete cascade, primary key (internship_id, position_id));
create table public.universities (id uuid primary key default gen_random_uuid(), name text unique not null, short_name text, is_active boolean not null default true);
create table public.internship_universities (internship_id uuid references public.internships(id) on delete cascade, university_id uuid references public.universities(id) on delete cascade, primary key (internship_id, university_id));

create table public.submissions (
  id uuid primary key default gen_random_uuid(), type text not null check (type in ('new_company','new_internship','correction')),
  status public.submission_status not null default 'pending', payload jsonb not null, source_url text,
  review_note text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create index submissions_status_created on public.submissions(status, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id), internship_id uuid references public.internships(id),
  reason text not null, details text not null, status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity_type text not null, entity_id uuid, metadata jsonb, created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.internships enable row level security;
create policy "public reads active companies" on public.companies for select using (status = 'active');
create policy "public reads open internships" on public.internships for select using (status = 'open');
alter table public.submissions enable row level security;
alter table public.reports enable row level security;
create policy "public creates submissions" on public.submissions for insert with check (status = 'pending');
create policy "public creates reports" on public.reports for insert with check (status = 'pending');
