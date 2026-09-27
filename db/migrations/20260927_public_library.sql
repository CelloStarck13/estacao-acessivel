create or replace function public.get_public_library()
returns table (
  id uuid,
  title text,
  description text,
  component text,
  school_year text,
  term text,
  theme text,
  learning_objective text,
  support_needs jsonb,
  response_modes jsonb,
  access_code text,
  published_at timestamptz,
  question_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    a.title,
    a.description,
    a.component,
    a.school_year,
    a.term,
    a.theme,
    a.learning_objective,
    coalesce(a.support_needs, '[]'::jsonb),
    coalesce(a.response_modes, '[]'::jsonb),
    a.access_code,
    a.published_at,
    count(q.id)::bigint
  from public.activities a
  left join public.questions q on q.activity_id = a.id
  where a.status = 'published'
    and a.is_public = true
  group by a.id
  order by a.published_at desc nulls last, a.created_at desc;
$$;

revoke all on function public.get_public_library() from public;
grant execute on function public.get_public_library() to anon, authenticated;

create or replace function public.get_public_library_activity(p_activity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  payload jsonb;
begin
  select jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'description', a.description,
    'component', a.component,
    'school_year', a.school_year,
    'term', a.term,
    'theme', a.theme,
    'learning_objective', a.learning_objective,
    'support_needs', coalesce(a.support_needs, '[]'::jsonb),
    'response_modes', coalesce(a.response_modes, '[]'::jsonb),
    'access_code', a.access_code,
    'published_at', a.published_at,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'position', q.position,
        'prompt', q.prompt,
        'question_type', q.question_type,
        'options', coalesce(q.options, '[]'::jsonb),
        'accessibility_support', q.accessibility_support,
        'points', q.points,
        'media_url', q.media_url,
        'media_alt', q.media_alt,
        'media_caption', q.media_caption
      ) order by q.position)
      from public.questions q
      where q.activity_id = a.id
    ), '[]'::jsonb)
  )
  into payload
  from public.activities a
  where a.id = p_activity_id
    and a.status = 'published'
    and a.is_public = true;

  return payload;
end;
$$;

revoke all on function public.get_public_library_activity(uuid) from public;
grant execute on function public.get_public_library_activity(uuid) to anon, authenticated;
