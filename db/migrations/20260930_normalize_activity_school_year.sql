update public.activities
set school_year = case
  when trim(school_year) = '1ª série' then '1ª série EM'
  when trim(school_year) = '2ª série' then '2ª série EM'
  when trim(school_year) = '3ª série' then '3ª série EM'
  else school_year
end
where trim(coalesce(school_year,'')) in ('1ª série','2ª série','3ª série');
