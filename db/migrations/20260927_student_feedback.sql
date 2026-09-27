-- Devolutiva segura ao estudante — DUDA

alter table public.activity_submissions
  add column if not exists feedback_token uuid;

update public.activity_submissions
set feedback_token = gen_random_uuid()
where feedback_token is null;

alter table public.activity_submissions
  alter column feedback_token set default gen_random_uuid(),
  alter column feedback_token set not null;

create unique index if not exists activity_submissions_feedback_token_idx
  on public.activity_submissions(feedback_token);

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
  v_feedback_token uuid;
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
  returning id, feedback_token into v_submission_id, v_feedback_token;

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

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'feedback_token', v_feedback_token,
    'score', v_score,
    'max_score', v_max
  );
end;
$$;

create or replace function public.get_submission_feedback(
  p_access_code text,
  p_feedback_token uuid
)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'activity_title', a.title,
    'component', a.component,
    'school_year', a.school_year,
    'participant_alias', s.participant_alias,
    'score', s.score,
    'max_score', s.max_score,
    'completed_at', s.completed_at,
    'review_complete', not exists (
      select 1
      from public.submission_answers pending
      join public.questions pq on pq.id = pending.question_id
      where pending.submission_id = s.id
        and pq.question_type = 'open_text'
        and pending.reviewed_at is null
    ),
    'answers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', q.position,
          'prompt', q.prompt,
          'question_type', q.question_type,
          'answer', sa.answer,
          'is_correct', sa.is_correct,
          'points_awarded', sa.points_awarded,
          'max_points', q.points,
          'review_note', sa.review_note,
          'reviewed_at', sa.reviewed_at
        )
        order by q.position
      )
      from public.submission_answers sa
      join public.questions q on q.id = sa.question_id
      where sa.submission_id = s.id
    ), '[]'::jsonb)
  )
  from public.activity_submissions s
  join public.activities a on a.id = s.activity_id
  where s.feedback_token = p_feedback_token
    and upper(a.access_code) = upper(trim(p_access_code))
    and a.status = 'published'
    and a.is_public = true
  limit 1;
$$;

revoke all on function public.get_submission_feedback(text, uuid) from public;
grant execute on function public.get_submission_feedback(text, uuid) to anon, authenticated;

revoke all on function public.submit_activity(text, jsonb, text) from public;
grant execute on function public.submit_activity(text, jsonb, text) to anon, authenticated;
