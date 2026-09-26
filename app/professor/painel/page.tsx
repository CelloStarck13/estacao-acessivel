"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./painel.css";
import { Accessibility, Bell, BookOpen, Bot, CalendarClock, CheckSquare, ChevronDown, ChevronRight, CirclePlus, Clock3, FileCheck2, FileCode2, FilePlus2, House, Info, Lightbulb, LogOut, Search, Send, Settings, ShieldCheck, Sparkles, Trash2, Upload, Users } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const menu = [
  ["Início", House], ["Criar atividade", CirclePlus], ["Adaptar material", FileCode2],
  ["Biblioteca", BookOpen], ["Escopo curricular", FileCheck2], ["Acessibilidade", Accessibility],
  ["Gabaritos", CheckSquare], ["Exportações", Upload], ["Configurações", Settings],
] as const;

type ActivitySummary = { id: string; title: string; description: string | null; component: string | null; school_year: string | null; status: string; access_code: string | null; created_at: string; responseCount: number };
type MaterialAdaptationSummary = { id: string; title: string; source_file_name: string | null; status: string; created_at: string; learner_profiles: string[] | null; };
type DashboardFilter = "activities" | "published" | "adaptations" | "responses";

export default function ProfessorDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [userName, setUserName] = useState("Professor");
  const [userEmail, setUserEmail] = useState("");
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [adaptations, setAdaptations] = useState<MaterialAdaptationSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingAdaptations, setLoadingAdaptations] = useState(true);
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("activities");
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/professor");
        return;
      }

      const user = data.session.user;
      setUserEmail(user.email ?? "");
      const [{ data: profile, error: profileError }, { data: activityRows, error: activitiesError }, { data: adaptationRows, error: adaptationsError }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.from("activities").select("id,title,description,component,school_year,status,access_code,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("material_adaptations").select("id,title,source_file_name,status,created_at,learner_profiles").eq("owner_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (profileError || activitiesError || adaptationsError) {
        setLoadError("Não foi possível carregar todos os dados do painel. Atualize a página para tentar novamente.");
      }
      const ids = (activityRows ?? []).map((activity) => activity.id);
      const { data: submissionRows, error: submissionsError } = ids.length ? await supabase.from("activity_submissions").select("activity_id").in("activity_id", ids) : { data: [], error: null };
      if (submissionsError) setLoadError("As atividades foram carregadas, mas não foi possível conferir as respostas recebidas.");
      const counts = new Map<string, number>();
      for (const submission of submissionRows ?? []) counts.set(submission.activity_id, (counts.get(submission.activity_id) ?? 0) + 1);
      setActivities((activityRows ?? []).map((activity) => ({ ...activity, responseCount: counts.get(activity.id) ?? 0 })) as ActivitySummary[]);
      setAdaptations((adaptationRows ?? []) as MaterialAdaptationSummary[]);
      setLoadingActivities(false);
      setLoadingAdaptations(false);
      const displayName = profile?.display_name?.trim();
      setUserName(displayName || user.email?.split("@")[0] || "Professor");
      setAuthorized(true);
    });
  }, [router]);

  const initials = useMemo(() => userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PR", [userName]);
  const filteredActivities = useMemo(() => activities.filter((activity) => {
    const matchesSearch = `${activity.title} ${activity.component ?? ""} ${activity.school_year ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "published") return activity.status === "published";
    if (activeFilter === "responses") return activity.responseCount > 0;
    return true;
  }), [activities, searchTerm, activeFilter]);
  const filteredAdaptations = useMemo(() => adaptations.filter((item) => `${item.title} ${item.source_file_name ?? ""} ${(item.learner_profiles ?? []).join(" ")}`.toLowerCase().includes(searchTerm.toLowerCase())), [adaptations, searchTerm]);
  const publishedCount = activities.filter((activity) => activity.status === "published").length;
  const draftCount = activities.length - publishedCount;
  const responseCount = activities.reduce((total, activity) => total + activity.responseCount, 0);
  const timelineItems = useMemo(() => [
    ...activities.map((activity) => ({ id: activity.id, title: activity.title, created_at: activity.created_at, kind: "Atividade" as const })),
    ...adaptations.map((item) => ({ id: item.id, title: item.title, created_at: item.created_at, kind: "Material adaptado" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10), [activities, adaptations]);
  const metrics: ReadonlyArray<readonly [DashboardFilter, string, number, typeof FileCheck2]> = [
    ["activities", "Atividades", activities.length, FileCheck2],
    ["published", "Publicadas", publishedCount, Send],
    ["adaptations", "Materiais adaptados", adaptations.length, FileCode2],
    ["responses", "Respostas recebidas", responseCount, Users],
  ];
  const activityHeading = activeFilter === "published" ? "Atividades publicadas" : activeFilter === "responses" ? "Atividades com respostas" : "Minhas atividades";

  function selectFilter(filter: DashboardFilter) {
    setActiveFilter(filter);
    window.requestAnimationFrame(() => document.getElementById("dashboard-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function deleteActivity(id: string, title: string) {
    if (!window.confirm(`Excluir definitivamente a atividade “${title}”? As respostas vinculadas também serão excluídas.`)) return;
    setDeletingId(id);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) {
      setDeletingId(null);
      window.alert("Não foi possível excluir a atividade.");
      return;
    }
    setActivities((current) => current.filter((activity) => activity.id !== id));
    setDeletingId(null);
  }

  async function deleteAdaptation(id: string, title: string) {
    if (!window.confirm(`Excluir definitivamente o material adaptado “${title}”? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("material_adaptations").delete().eq("id", id);
    if (error) {
      setDeletingId(null);
      window.alert("Não foi possível excluir o material adaptado.");
      return;
    }
    setAdaptations((current) => current.filter((item) => item.id !== id));
    setDeletingId(null);
  }

  async function logout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/professor");
  }

  if (!authorized) {
    return <main className="authPage"><section className="authPanel"><p>Verificando acesso...</p></section></main>;
  }

  return <main className="dashboardShell">
    <header className="dashboardTopbar">
      <Link href="/" className="dashboardBrand"><span><BookOpen /></span><b><strong>DUDA</strong> — Estação <em>Acessível</em><small>Tecnologia, Programação e Robótica</small></b></Link>
      <label className="dashboardSearch"><Search /><input aria-label="Buscar atividade ou material" placeholder="Buscar atividades e materiais adaptados" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label>
      <div className="dashboardUser"><button aria-label="Notificações"><Bell /><i>1</i></button><span>{initials}</span><div className="userIdentity"><b>{userName}</b><small>{userEmail}</small></div><button className="logoutButton" onClick={logout} aria-label="Sair"><LogOut /></button></div>
    </header>
    <aside className="dashboardSidebar"><nav>{menu.map(([label, Icon], index) => {
      if (label === "Criar atividade") return <Link href="/professor/atividade/nova" key={label}><Icon />{label}</Link>;
      if (label === "Adaptar material") return <Link href="/professor/material/adaptar" key={label}><Icon />{label}</Link>;
      if (label === "Biblioteca") return <Link href="/biblioteca" key={label}><Icon />{label}</Link>;
      return <button className={index === 0 ? "active" : ""} key={label}><Icon />{label}</button>;
    })}</nav></aside>
    <section className="dashboardMain">
      <div className="welcomeRow"><div><h1>Olá, {userName.split(/\s+/)[0]}!</h1><p>Crie, personalize, publique e acompanhe atividades acessíveis.</p></div><span><ShieldCheck /> Dados reais e protegidos</span></div>
      <div className="quickActions">
        <Link className="quickAction create" href="/professor/atividade/nova"><FilePlus2 /><span><b>Criar nova atividade</b><small>Selecione o currículo e personalize para o estudante</small></span><ChevronRight /></Link>
        <Link className="quickAction adapt" href="/professor/material/adaptar"><FileCode2 /><span><b>Adaptar material existente</b><small>Envie ou cole um material e personalize o acesso</small></span><ChevronRight /></Link>
        <Link className="quickAction library" href="/biblioteca"><BookOpen /><span><b>Abrir biblioteca</b><small>Explore atividades prontas por categoria</small></span><ChevronRight /></Link>
      </div>
      {loadError && <div className="dashboardError" role="alert">{loadError}</div>}
      <div className="metricsGrid" aria-label="Filtros do painel">{metrics.map(([filter,label,value,Icon], index) => <button type="button" key={filter} className={activeFilter === filter ? "activeMetric" : ""} aria-pressed={activeFilter === filter} onClick={() => selectFilter(filter)}><span className={index===3?"purple":""}><Icon /></span><div><small>{label}</small><b>{value}</b></div></button>)}</div>
      <div id="dashboard-results" className="dashboardResults">
      {activeFilter !== "adaptations" && <>
      <div className="sectionHeading"><h2>{activityHeading}</h2><span>{filteredActivities.length} encontrada(s){activeFilter === "responses" ? ` • ${responseCount} envio(s)` : ""}</span></div>
      {loadingActivities ? <div className="activityEmpty">Carregando suas atividades...</div> : filteredActivities.length === 0 ? <div className="activityEmpty"><FilePlus2/><h3>{activities.length ? "Nenhuma atividade corresponde à busca." : "Você ainda não criou uma atividade."}</h3>{!activities.length && <Link href="/professor/atividade/nova">Criar primeira atividade</Link>}</div> : <div className="activityGrid">{filteredActivities.map((activity,index) => <article className="activityCard" key={activity.id}>
        <div className="activityTop"><span className={activity.status === "published" ? "tag0" : "tag2"}>{activity.status === "published" ? "Publicada" : "Rascunho"}</span><div className="cardTopActions"><small>{activity.responseCount} resposta(s)</small><button type="button" className="deleteCardButton" disabled={deletingId === activity.id} onClick={() => void deleteActivity(activity.id, activity.title)} aria-label={`Excluir ${activity.title}`} title="Excluir atividade"><Trash2 /></button></div></div><div className={`activityArt art${index % 3}`}><FileCheck2 /></div>
        <h3>{activity.title}</h3><small>{[activity.school_year, activity.component].filter(Boolean).join(" • ") || "Atividade personalizada"}</small><div className="createdLine"><CalendarClock /> Criada em {formatDateTime(activity.created_at)}</div><p>{activity.description || "Sem descrição."}</p><div className="activityButtons"><Link href={`/professor/atividade/${activity.id}`}>{activity.status === "published" ? "Abrir e ver respostas" : "Continuar editando"}</Link>{activity.status === "published" && activity.access_code ? <Link href={`/estudante/atividade/${activity.access_code}`}>Ver como estudante</Link> : <span>Ainda não publicada</span>}</div>
      </article>)}</div>}
      </>}

      {(activeFilter === "activities" || activeFilter === "adaptations") && <>
      <div className="sectionHeading materialHeading"><h2>Materiais adaptados</h2><span>{filteredAdaptations.length} encontrado(s)</span></div>
      {loadingAdaptations ? <div className="activityEmpty">Carregando materiais adaptados...</div> : filteredAdaptations.length === 0 ? <div className="activityEmpty"><FileCode2/><h3>{adaptations.length ? "Nenhum material adaptado corresponde à busca." : "Você ainda não salvou um material adaptado."}</h3>{!adaptations.length && <Link href="/professor/material/adaptar">Adaptar primeiro material</Link>}</div> : <div className="activityGrid adaptationGrid">{filteredAdaptations.map((item,index) => <article className="activityCard adaptationCard" key={item.id}>
        <div className="activityTop"><span className="tag1">Material adaptado</span><div className="cardTopActions"><small>{item.status === "draft" ? "Rascunho" : item.status}</small><button type="button" className="deleteCardButton" disabled={deletingId === item.id} onClick={() => void deleteAdaptation(item.id, item.title)} aria-label={`Excluir ${item.title}`} title="Excluir material adaptado"><Trash2 /></button></div></div>
        <div className={`activityArt art${(index + 1) % 3}`}><FileCode2 /></div>
        <h3>{item.title}</h3><small>{item.source_file_name ? `Arquivo: ${item.source_file_name}` : "Conteúdo colado no DUDA"}</small><div className="createdLine"><CalendarClock /> Criado em {formatDateTime(item.created_at)}</div>
        {(item.learner_profiles ?? []).length ? <div className="profileTags">{(item.learner_profiles ?? []).slice(0,3).map((profile) => <span key={profile}>{profile}</span>)}</div> : <p>Sem perfil específico informado.</p>}
        <div className="activityButtons singleAction"><Link href={`/professor/material/adaptado/${item.id}`}>Abrir adaptação</Link></div>
      </article>)}</div>}
      </>}

      {activeFilter === "activities" && <>
      <div className="sectionHeading timelineHeading"><h2>Linha do tempo</h2><span>10 registros mais recentes</span></div>
      <section className="creationTimeline">
        {timelineItems.length === 0 ? <p>Nenhuma criação registrada ainda.</p> : timelineItems.map((item) => <article key={`${item.kind}-${item.id}`}>
          <span className={item.kind === "Atividade" ? "timelineDot activityDot" : "timelineDot adaptationDot"} />
          <div><b>{item.title}</b><small>{item.kind}</small></div>
          <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
        </article>)}
      </section>
      </>}
      </div>
    </section>
    <aside className="aiSidebar"><div className="aiTitle"><h2>Assistente de IA</h2><ChevronDown /></div><section className="aiCard"><span className="botCircle"><Bot /></span><h3>Assistente conectado</h3><b className="online"><i /> Ativo</b><p>Receba sugestões de atividades, adaptações e objetivos de aprendizagem com base nas suas necessidades.</p><button><Sparkles /> Gerar com IA</button><small><Info /> Conteúdo sujeito à revisão do professor.</small></section><section className="tipCard"><Lightbulb /><div><h3>Dica do dia</h3><p>Atividades com exemplos do cotidiano tornam a aprendizagem mais significativa e inclusiva.</p></div></section><footer>DUDA — Estação Acessível • Versão preliminar • Material pedagógico independente</footer></aside>
  </main>;
}
