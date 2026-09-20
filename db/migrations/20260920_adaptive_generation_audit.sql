alter table public.activities
  add column if not exists access_barriers jsonb not null default '[]'::jsonb,
  add column if not exists communication_modes jsonb not null default '[]'::jsonb,
  add column if not exists personalization_signature text,
  add column if not exists generation_status text not null default 'not_applicable'
    check (generation_status in ('not_applicable', 'approved', 'blocked'));

create table if not exists public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  personalization_signature text not null,
  engine_version text not null default 'duda-personalization-v1',
  input_snapshot jsonb not null,
  output_snapshot jsonb not null,
  status text not null check (status in ('approved', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.generation_checks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.generation_requests(id) on delete cascade,
  check_key text not null,
  passed boolean not null,
  detail text not null,
  created_at timestamptz not null default now(),
  unique (request_id, check_key)
);

create index if not exists generation_requests_activity_idx on public.generation_requests(activity_id);
create index if not exists generation_requests_owner_idx on public.generation_requests(owner_id);
create index if not exists generation_requests_signature_idx on public.generation_requests(personalization_signature);
create index if not exists generation_checks_request_idx on public.generation_checks(request_id);

alter table public.generation_requests enable row level security;
alter table public.generation_checks enable row level security;

drop policy if exists "Teachers manage own generation requests" on public.generation_requests;
create policy "Teachers manage own generation requests"
on public.generation_requests for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Teachers read own generation checks" on public.generation_checks;
create policy "Teachers read own generation checks"
on public.generation_checks for select to authenticated
using (exists (
  select 1 from public.generation_requests request
  where request.id = request_id and request.owner_id = (select auth.uid())
));

drop policy if exists "Teachers insert own generation checks" on public.generation_checks;
create policy "Teachers insert own generation checks"
on public.generation_checks for insert to authenticated
with check (exists (
  select 1 from public.generation_requests request
  where request.id = request_id and request.owner_id = (select auth.uid())
));

grant select, insert, update, delete on public.generation_requests to authenticated;
grant select, insert on public.generation_checks to authenticated;
