-- DUDA — Estação Acessível
-- Esquema canônico atual do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  school_name text,
  role text not null default 'professor' check (role in ('professor','gestao','admin')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;

drop policy if exists "User reads own profile" on public.profiles;
create policy "User reads own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "User updates own profile" on public.profiles;
create policy "User updates own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  component text,
  school_year text,
  learning_objective text,
  delivery_mode text not null default 'digital' check (delivery_mode in ('digital','print','both')),
  status text not null default 'draft' check (status in ('draft','published','review')),
  access_code text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  prompt text not null,
  question_type text not null default 'open_text' check (question_type in ('instruction','open_text','multiple_choice','true_false')),
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb,
  accessibility_support text,
  points numeric(8,2) not null default 1 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id, position)
);

create index if not exists activities_owner_id_idx on public.activities(owner_id);
create index if not exists activities_access_code_idx on public.activities(access_code) where access_code is not null;
create index if not exists questions_activity_id_idx on public.questions(activity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

alter table public.activities enable row level security;
alter table public.questions enable row level security;

drop policy if exists "Owners read activities" on public.activities;
create policy "Owners read activities"
on public.activities for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Owners create activities" on public.activities;
create policy "Owners create activities"
on public.activities for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Owners update activities" on public.activities;
create policy "Owners update activities"
on public.activities for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners delete activities" on public.activities;
create policy "Owners delete activities"
on public.activities for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Owners read questions" on public.questions;
create policy "Owners read questions"
on public.questions for select
to authenticated
using (exists (
  select 1 from public.activities a
  where a.id = questions.activity_id and a.owner_id = auth.uid()
));

drop policy if exists "Owners create questions" on public.questions;
create policy "Owners create questions"
on public.questions for insert
to authenticated
with check (exists (
  select 1 from public.activities a
  where a.id = questions.activity_id and a.owner_id = auth.uid()
));

drop policy if exists "Owners update questions" on public.questions;
create policy "Owners update questions"
on public.questions for update
to authenticated
using (exists (
  select 1 from public.activities a
  where a.id = questions.activity_id and a.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.activities a
  where a.id = questions.activity_id and a.owner_id = auth.uid()
));

drop policy if exists "Owners delete questions" on public.questions;
create policy "Owners delete questions"
on public.questions for delete
to authenticated
using (exists (
  select 1 from public.activities a
  where a.id = questions.activity_id and a.owner_id = auth.uid()
));
