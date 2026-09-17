-- Biblioteca visual acessível e mídia vinculada às questões
alter table public.questions add column if not exists media_url text;
alter table public.questions add column if not exists media_alt text;
alter table public.questions add column if not exists media_caption text;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  title text not null,
  file_url text not null unique,
  alt_text text not null,
  caption text,
  themes text[] not null default '{}',
  school_years text[] not null default '{}',
  accessibility_tags text[] not null default '{}',
  source_name text not null default 'DUDA — produção autoral',
  license text not null default 'Uso pedagógico interno do projeto',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;
grant select on public.media_assets to anon, authenticated;
drop policy if exists "Public reads active media" on public.media_assets;
create policy "Public reads active media" on public.media_assets for select to anon, authenticated using (active = true);

insert into public.media_assets(asset_key,title,file_url,alt_text,caption,themes,school_years,accessibility_tags)
values
('verificar-informacao','Verificação de informação','/activity-media/verificar-informacao.svg','Comparação entre uma mensagem sem fonte e uma informação confirmada por fonte oficial','Observe os sinais de confiabilidade antes de compartilhar.',array['educação midiática','cidadania digital','desinformação'],array['9º ano'],array['texto alternativo','alto contraste','organização visual']),
('seguranca-digital','Segurança digital','/activity-media/seguranca-digital.svg','Escudo protegendo senha e dados pessoais de uma mensagem desconhecida','Dados pessoais e senhas devem ser protegidos.',array['segurança cibernética','cultura digital'],array['6º ano','7º ano'],array['texto alternativo','linguagem objetiva']),
('comunicacao-acessivel','Comunicação acessível','/activity-media/comunicacao-acessivel.svg','Cartaz organizado em título, imagem, mensagem curta e chamada para ação','Uma comunicação acessível organiza as informações essenciais.',array['mídias digitais','comunicação'],array['7º ano','8º ano','9º ano','3ª série'],array['texto alternativo','organização visual']),
('fluxo-algoritmo','Fluxo de algoritmo','/activity-media/fluxo-algoritmo.svg','Fluxo visual com início, entrada, decisão e resultado','Organize o problema em uma sequência que possa ser testada.',array['algoritmos','programação','python'],array['6º ano','7º ano','8º ano','9º ano','2ª série','3ª série'],array['texto alternativo','sequência visual']),
('robo-sensor','Carrinho com sensor','/activity-media/robo-sensor.svg','Carrinho robótico usando um sensor para identificar um obstáculo à frente','O sensor fornece a entrada usada para decidir quando parar.',array['robótica','sensores','automação'],array['6º ano','7º ano','8º ano','9º ano','1ª série','2ª série','3ª série'],array['texto alternativo','diagrama visual'])
,
('leitura-dados','Leitura de dados','/activity-media/leitura-dados.svg','Tabela simples transformada em gráfico de barras com categorias identificadas','Dados organizados ajudam a comparar valores e reconhecer padrões.',array['planilhas','ciência de dados','análise de dados'],array['8º ano','9º ano','2ª série','3ª série'],array['texto alternativo','gráfico acessível','alto contraste'])
on conflict (asset_key) do update set title=excluded.title,file_url=excluded.file_url,alt_text=excluded.alt_text,caption=excluded.caption,themes=excluded.themes,school_years=excluded.school_years,accessibility_tags=excluded.accessibility_tags,active=true;

create or replace function public.get_published_activity(p_access_code text)
returns jsonb language sql security definer set search_path = '' stable as $$
  select jsonb_build_object(
    'id', a.id, 'title', a.title, 'description', a.description, 'component', a.component,
    'school_year', a.school_year, 'learning_objective', a.learning_objective,
    'support_needs', a.support_needs,
    'questions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', q.id, 'position', q.position, 'prompt', q.prompt, 'question_type', q.question_type,
      'options', q.options, 'accessibility_support', q.accessibility_support, 'points', q.points,
      'media_url', q.media_url, 'media_alt', q.media_alt, 'media_caption', q.media_caption
    ) order by q.position) from public.questions q where q.activity_id = a.id), '[]'::jsonb)
  ) from public.activities a
  where upper(a.access_code) = upper(trim(p_access_code)) and a.status = 'published' and a.is_public = true limit 1;
$$;
revoke all on function public.get_published_activity(text) from public;
grant execute on function public.get_published_activity(text) to anon, authenticated;
