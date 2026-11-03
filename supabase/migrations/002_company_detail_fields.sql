alter table public.companies
  alter column latitude drop not null,
  alter column longitude drop not null;

alter table public.companies
  add column if not exists google_maps_url text,
  add column if not exists coordinator_name text,
  add column if not exists coordinator_title text,
  add column if not exists coordinator_phone text,
  add column if not exists authorized_name text,
  add column if not exists authorized_title text,
  add column if not exists business_hours text,
  add column if not exists advisor_recommendation text,
  add column if not exists advisor_name text;
