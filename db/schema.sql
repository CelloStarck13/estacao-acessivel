create type user_role as enum ('TEACHER', 'ADMIN');
create type activity_status as enum ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

create table users (
  id uuid primary key,
  email text unique not null,
  role user_role not null default 'TEACHER',
  created_at timestamptz not null default now()
);

create table login_codes (
  id uuid primary key,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create table curriculum_items (
  id uuid primary key,
  education_stage text not null,
  grade text not null,
  component text not null,
  term integer,
  week integer,
  content text not null,
  learning_objective text,
  confirmed_skill text,
  source_title text not null,
  source_reference text
);

create table activities (
  id uuid primary key,
  author_id uuid references users(id),
  curriculum_item_id uuid references curriculum_items(id),
  title text not null,
  instructions jsonb not null default '[]',
  content jsonb not null,
  accessibility_supports jsonb not null default '[]',
  answer_key jsonb,
  status activity_status not null default 'DRAFT',
  access_code text unique,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
