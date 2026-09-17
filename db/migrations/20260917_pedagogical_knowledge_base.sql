create table if not exists public.curriculum_documents (
  id uuid primary key default gen_random_uuid(),
  material_key text not null references public.curriculum_material_units(material_key) on delete cascade,
  audience text not null check (audience in ('teacher', 'student')),
  label text not null,
  source_url text not null,
  document_kind text not null default 'reference',
  lesson_number integer,
  source_status text not null default 'official',
  indexing_status text not null default 'catalogued' check (indexing_status in ('catalogued', 'extracted', 'reviewed', 'failed')),
  created_at timestamptz not null default now(),
  unique (material_key, audience, source_url)
);

create table if not exists public.pedagogical_units (
  material_key text primary key references public.curriculum_material_units(material_key) on delete cascade,
  component text not null,
  school_year text not null,
  term text not null,
  unit_title text not null,
  domain text not null,
  pedagogical_focus text not null,
  learning_objectives jsonb not null default '[]'::jsonb,
  core_concepts jsonb not null default '[]'::jsonb,
  authentic_contexts jsonb not null default '[]'::jsonb,
  activity_patterns jsonb not null default '[]'::jsonb,
  assessment_evidence jsonb not null default '[]'::jsonb,
  misconception_alerts jsonb not null default '[]'::jsonb,
  source_documents jsonb not null default '[]'::jsonb,
  fidelity_status text not null default 'catalogued' check (fidelity_status in ('catalogued', 'extracted', 'reviewed')),
  ready_for_generation boolean not null default false,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.accessibility_strategies (
  strategy_key text primary key,
  profile text not null,
  access_barriers jsonb not null default '[]'::jsonb,
  presentation_supports jsonb not null default '[]'::jsonb,
  action_expression_supports jsonb not null default '[]'::jsonb,
  engagement_supports jsonb not null default '[]'::jsonb,
  prohibited_shortcuts jsonb not null default '[]'::jsonb,
  validation_notes text,
  source_status text not null default 'pedagogical_review',
  updated_at timestamptz not null default now()
);

alter table public.curriculum_documents enable row level security;
alter table public.pedagogical_units enable row level security;
alter table public.accessibility_strategies enable row level security;

drop policy if exists "Authenticated reads curriculum documents" on public.curriculum_documents;
create policy "Authenticated reads curriculum documents" on public.curriculum_documents for select to authenticated using (true);
drop policy if exists "Authenticated reads pedagogical units" on public.pedagogical_units;
create policy "Authenticated reads pedagogical units" on public.pedagogical_units for select to authenticated using (true);
drop policy if exists "Authenticated reads accessibility strategies" on public.accessibility_strategies;
create policy "Authenticated reads accessibility strategies" on public.accessibility_strategies for select to authenticated using (true);

grant select on public.curriculum_documents, public.pedagogical_units, public.accessibility_strategies to authenticated;

insert into public.curriculum_documents (material_key, audience, label, source_url, document_kind, lesson_number)
select u.material_key, 'teacher', d->>'label', d->>'url',
  case when lower(d->>'label') like '%exerc%' then 'exercise'
       when lower(d->>'label') like '%desafio%' then 'challenge'
       when lower(d->>'label') like '%slide%' or lower(d->>'label') like '%guia%' then 'lesson'
       when lower(d->>'label') like '%material do professor%' then 'teacher_guide'
       else 'reference' end,
  nullif(substring(d->>'label' from '[0-9]+'), '')::integer
from public.curriculum_material_units u
cross join lateral jsonb_array_elements(coalesce(u.teacher_materials, '[]'::jsonb)) d
where coalesce(d->>'url','') <> ''
on conflict (material_key, audience, source_url) do nothing;

insert into public.curriculum_documents (material_key, audience, label, source_url, document_kind, lesson_number)
select u.material_key, 'student', d->>'label', d->>'url',
  case when lower(d->>'label') like '%exerc%' then 'exercise'
       when lower(d->>'label') like '%desafio%' then 'challenge'
       when lower(d->>'label') like '%slide%' then 'lesson'
       else 'student_material' end,
  nullif(substring(d->>'label' from '[0-9]+'), '')::integer
from public.curriculum_material_units u
cross join lateral jsonb_array_elements(coalesce(u.student_materials, '[]'::jsonb)) d
where coalesce(d->>'url','') <> ''
on conflict (material_key, audience, source_url) do nothing;

insert into public.accessibility_strategies
  (strategy_key, profile, access_barriers, presentation_supports, action_expression_supports, engagement_supports, prohibited_shortcuts, validation_notes)
values
('tea','TEA','["ambiguidade", "sobrecarga sensorial", "mudanças sem antecipação"]','["linguagem literal", "rotina visual", "uma etapa por vez", "exemplo completo"]','["seleção", "texto curto", "sequência visual", "comunicação alternativa"]','["objetivo visível", "previsibilidade", "escolhas limitadas"]','["infantilizar", "reduzir o objetivo curricular", "usar metáfora sem explicação"]','A adaptação remove barreiras sem empobrecer o conteúdo.'),
('surdez','Surdez','["informação apenas oral", "vídeo sem legenda ou Libras", "vocabulário sem apoio contextual"]','["instrução escrita", "apoio visual", "legenda", "Libras conforme preferência linguística"]','["texto", "seleção visual", "vídeo em Libras", "produção multimodal"]','["referências visuais", "interação acessível entre pares"]','["depender de áudio", "tratar Libras como simples tradução palavra por palavra"]','Confirmar a língua preferencial do estudante e não presumir oralização.'),
('deficiencia_intelectual','Deficiência intelectual','["carga cognitiva excessiva", "múltiplas ações simultâneas", "abstração sem exemplo"]','["exemplo concreto", "pistas graduais", "vocabulário essencial", "segmentação"]','["seleção", "ordenação", "resposta apoiada", "demonstração prática"]','["feedback imediato", "retomada", "progressão em pequenas etapas"]','["substituir aprendizagem por passatempo", "fornecer a resposta", "eliminar desafio cognitivo"]','Manter o mesmo conceito central com mediação e complexidade de acesso ajustadas.'),
('cegueira','Cegueira','["informação apenas visual", "ordem de leitura confusa", "controles sem rótulo"]','["descrição textual", "estrutura semântica", "compatibilidade com leitor de tela"]','["teclado", "texto", "áudio", "material tátil quando pertinente"]','["navegação previsível", "instruções verificáveis sem visão"]','["usar cor ou posição como única pista", "imagem sem descrição funcional"]','Toda informação essencial deve possuir equivalente não visual.'),
('baixa_visao','Baixa visão','["baixo contraste", "tipografia pequena", "poluição visual"]','["alto contraste", "ampliação", "espaçamento", "hierarquia visual"]','["zoom", "texto", "seleção ampliada"]','["foco visual claro", "poucos elementos por tela"]','["texto dentro de imagem sem alternativa", "excesso de cores e ornamentos"]','Permitir ampliação sem perda de conteúdo ou funcionalidade.'),
('tdah','TDAH / atenção e autorregulação','["tarefas longas sem marco", "distrações", "espera sem feedback"]','["blocos curtos", "objetivo visível", "marcadores de progresso"]','["respostas rápidas intercaladas", "pausa", "retomada"]','["feedback imediato", "metas de curto prazo", "escolha controlada"]','["reduzir tudo a questões fáceis", "usar animação decorativa"]','Estruturar atenção e autorregulação sem reduzir a exigência conceitual.')
on conflict (strategy_key) do update set
  access_barriers=excluded.access_barriers,
  presentation_supports=excluded.presentation_supports,
  action_expression_supports=excluded.action_expression_supports,
  engagement_supports=excluded.engagement_supports,
  prohibited_shortcuts=excluded.prohibited_shortcuts,
  validation_notes=excluded.validation_notes,
  updated_at=now();
