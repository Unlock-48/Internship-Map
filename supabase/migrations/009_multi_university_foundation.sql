create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text unique not null,
  short_name text,
  province text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.universities
  add column if not exists code text,
  add column if not exists province text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists universities_code_unique
  on public.universities(code)
  where code is not null;

create table if not exists public.academic_units (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  code text not null,
  name text not null,
  unit_type text not null default 'department',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, code),
  unique (university_id, name)
);

create index if not exists academic_units_university_active
  on public.academic_units(university_id, is_active);

alter table public.internships
  add column if not exists academic_unit_id uuid references public.academic_units(id) on delete set null;

create index if not exists internships_academic_unit_status
  on public.internships(academic_unit_id, status);

insert into public.universities (code, name, short_name, province)
values ('CMRU', 'มหาวิทยาลัยราชภัฏเชียงใหม่', 'มรภ.เชียงใหม่', 'เชียงใหม่')
on conflict (name) do update
set name = excluded.name,
    code = excluded.code,
    short_name = excluded.short_name,
    province = excluded.province,
    updated_at = now();

insert into public.academic_units (university_id, code, name, unit_type)
select id, 'COMSCI', 'ภาควิชาวิทยาการคอมพิวเตอร์', 'department'
from public.universities
where code = 'CMRU'
on conflict (university_id, code) do update
set name = excluded.name,
    unit_type = excluded.unit_type,
    updated_at = now();

update public.internships
set academic_unit_id = academic_units.id
from public.academic_units
join public.universities on universities.id = academic_units.university_id
where universities.code = 'CMRU'
  and academic_units.code = 'COMSCI'
  and public.internships.academic_unit_id is null;

alter table public.universities enable row level security;
alter table public.academic_units enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'universities'
      and policyname = 'public reads active universities'
  ) then
    create policy "public reads active universities" on public.universities
      for select using (is_active = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'academic_units'
      and policyname = 'public reads active academic units'
  ) then
    create policy "public reads active academic units" on public.academic_units
      for select using (is_active = true);
  end if;
end
$$;
