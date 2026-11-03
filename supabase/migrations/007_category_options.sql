create table if not exists public.category_options (
  id uuid primary key default gen_random_uuid(),
  category_type text not null check (category_type in ('organization_type', 'business_type')),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_type, name)
);

insert into public.category_options (category_type, name)
values
  ('organization_type', 'ไม่ระบุ'),
  ('organization_type', 'ภาคเอกชน'),
  ('organization_type', 'ภาครัฐ'),
  ('organization_type', 'Software House')
on conflict (category_type, name) do nothing;

insert into public.category_options (category_type, name)
select distinct 'business_type', trim(business_type)
from public.companies
where business_type is not null
  and trim(business_type) <> ''
on conflict (category_type, name) do nothing;

alter table public.category_options enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'category_options'
      and policyname = 'public reads active category options'
  ) then
    create policy "public reads active category options" on public.category_options
      for select using (is_active = true);
  end if;
end
$$;
