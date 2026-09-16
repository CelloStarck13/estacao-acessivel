-- Publicação e fluxo do estudante — DUDA

alter table public.activities
  add column if not exists published_at timestamptz;

create table if not exists public.activity_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  participant_alias text,
  score numeric(8,2),
  max_score numeric(8,2),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.activity_submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer jsonb not null,
  is_correct boolean,
  points_awarded numeric(8,2),
  created_at timestamptz not null default now(),
  unique(submission_id, question_id)
);

create index if not exists activity_submissions_activity_id_idx on public.activity_submissions(activity_id);
create index if not exists submission_answers_submission_id_idx on public.submission_answers(submission_id);

alter table public.activity_submissions enable row level security;
alter table public.submission_answers enable row level security;

drop policy if exists "Owners read submissions" on public.activity_submissions;
create policy "Owners read submissions" on public.activity_submissions for select to authenticated
using (exists (
  select 1 from public.activities a
  where a.id = activity_submissions.activity_id and a.owner_id = auth.uid()
));

drop policy if exists "Owners read submission answers" on public.submission_answers;
create policy "Owners read submission answers" on public.submission_answers for select to authenticated
using (exists (
  select 1
  from public.activity_submissions s
  join public.activities a on a.id = s.activity_id
  where s.id = submission_answers.submission_id and a.owner_id = auth.uid()
));

create or replace function public.get_published_activity(p_access_code text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'description', a.description,
    'component', a.component,
    'school_year', a.school_year,
    'learning_objective', a.learning_objective,
    'support_needs', a.support_needs,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'position', q.position,
        'prompt', q.prompt,
        'question_type', q.question_type,
        'options', q.options,
        'accessibility_support', q.accessibility_support,
        'points', q.points
      ) order by q.position)
      from public.questions q where q.activity_id = a.id
    ), '[]'::jsonb)
  )
  from public.activities a
  where upper(a.access_code) = upper(trim(p_access_code))
    and a.status = 'published'
    and a.is_public = true
  limit 1;
$$;

create or replace function public.submit_activity(
  p_access_code text,
  p_answers jsonb,
  p_participant_alias text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity public.activities%rowtype;
  v_submission_id uuid;
  v_answer jsonb;
  v_question public.questions%rowtype;
  v_is_correct boolean;
  v_awarded numeric(8,2);
  v_score numeric(8,2) := 0;
  v_max numeric(8,2) := 0;
begin
  select * into v_activity
  from public.activities
  where upper(access_code) = upper(trim(p_access_code))
    and status = 'published' and is_public = true;

  if not found then
    raise exception 'Atividade não encontrada ou indisponível';
  end if;

  select coalesce(sum(points), 0) into v_max
  from public.questions where activity_id = v_activity.id;

  insert into public.activity_submissions(activity_id, participant_alias, max_score)
  values (v_activity.id, nullif(trim(p_participant_alias), ''), v_max)
  returning id into v_submission_id;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    select * into v_question
    from public.questions
    where id = (v_answer->>'question_id')::uuid and activity_id = v_activity.id;

    if found then
      if v_question.correct_answer is null or v_question.question_type in ('instruction','open_text') then
        v_is_correct := null;
        v_awarded := null;
      else
        v_is_correct := v_question.correct_answer = (v_answer->'answer');
        v_awarded := case when v_is_correct then v_question.points else 0 end;
        v_score := v_score + v_awarded;
      end if;

      insert into public.submission_answers(submission_id, question_id, answer, is_correct, points_awarded)
      values (v_submission_id, v_question.id, v_answer->'answer', v_is_correct, v_awarded);
    end if;
  end loop;

  update public.activity_submissions set score = v_score where id = v_submission_id;
  return jsonb_build_object('submission_id', v_submission_id, 'score', v_score, 'max_score', v_max);
end;
$$;

revoke all on function public.get_published_activity(text) from public;
revoke all on function public.submit_activity(text, jsonb, text) from public;
grant execute on function public.get_published_activity(text) to anon, authenticated;
grant execute on function public.submit_activity(text, jsonb, text) to anon, authenticated;
