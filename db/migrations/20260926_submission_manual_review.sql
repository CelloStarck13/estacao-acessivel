-- Ponto 7 — acompanhamento e revisão das respostas do estudante

alter table public.submission_answers
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

create or replace function public.review_submission_answer(
  p_answer_id uuid,
  p_points_awarded numeric,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer public.submission_answers%rowtype;
  v_question public.questions%rowtype;
  v_submission public.activity_submissions%rowtype;
  v_activity public.activities%rowtype;
  v_score numeric(8,2);
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  select sa.* into v_answer
  from public.submission_answers sa
  where sa.id = p_answer_id;

  if not found then
    raise exception 'Resposta não encontrada';
  end if;

  select s.* into v_submission
  from public.activity_submissions s
  where s.id = v_answer.submission_id;

  select a.* into v_activity
  from public.activities a
  where a.id = v_submission.activity_id
    and a.owner_id = auth.uid();

  if not found then
    raise exception 'Sem permissão para revisar esta resposta';
  end if;

  select q.* into v_question
  from public.questions q
  where q.id = v_answer.question_id
    and q.activity_id = v_activity.id;

  if not found then
    raise exception 'Questão não encontrada';
  end if;

  if p_points_awarded is null or p_points_awarded < 0 or p_points_awarded > v_question.points then
    raise exception 'Pontuação inválida';
  end if;

  update public.submission_answers
  set points_awarded = p_points_awarded,
      review_note = nullif(trim(p_review_note), ''),
      reviewed_at = now()
  where id = p_answer_id;

  select coalesce(sum(coalesce(sa.points_awarded, 0)), 0)
  into v_score
  from public.submission_answers sa
  where sa.submission_id = v_submission.id;

  update public.activity_submissions
  set score = v_score
  where id = v_submission.id;

  return jsonb_build_object(
    'submission_id', v_submission.id,
    'answer_id', p_answer_id,
    'score', v_score,
    'max_score', v_submission.max_score,
    'points_awarded', p_points_awarded
  );
end;
$$;

revoke all on function public.review_submission_answer(uuid, numeric, text) from public, anon;
grant execute on function public.review_submission_answer(uuid, numeric, text) to authenticated;
