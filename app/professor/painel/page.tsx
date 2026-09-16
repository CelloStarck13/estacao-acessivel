"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./painel.css";
import { Accessibility, Bell, BookOpen, Bot, CheckSquare, ChevronDown, ChevronRight, CirclePlus, Clock3, FileCheck2, FileCode2, FilePlus2, House, Info, Lightbulb, LogOut, Search, Send, Settings, ShieldCheck, Sparkles, Upload, Users } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const menu = [
  ["Início", House], ["Criar atividade", CirclePlus], ["Adaptar material", FileCode2],
  ["Biblioteca", BookOpen], ["Escopo curricular", FileCheck2], ["Acessibilidade", Accessibility],
  ["Gabaritos", CheckSquare], ["Exportações", Upload], ["Configurações", Settings],
] as const;

type ActivitySummary = { id: string; title: string; description: string | null; component: string | null; school_year: string | null; status: string; access_code: string | null; created_at: string; responseCount: number };

export default function ProfessorDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [userName, setUserName] = useState("Professor");
  const [userEmail, setUserEmail] = useState("");
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/professor");
        return;
      }

      const user = data.session.user;
      setUserEmail(user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const { data: activityRows } = await supabase.from("activities").select("id,title,description,component,school_year,status,access_code,created_at").eq("owner_id", user.id).order("created_at", { ascending: false });
      const ids = (activityRows ?? []).map((activity) => activity.id);
      const { data: submissionRows } = ids.length ? await supabase.from("activity_submissions").select("activity_id").in("activity_id", ids) : { data: [] };
      const counts = new Map<string, number>();
      for (const submission of submissionRows ?? []) counts.set(submission.activity_id, (counts.get(submission.activity_id) ?? 0) + 1);
      setActivities((activityRows ?? []).map((activity) => ({ ...activity, responseCount: counts.get(activity.id) ?? 0 })) as ActivitySummary[]);
      setLoadingActivities(false);
      const displayName = profile?.display_name?.trim();
      setUserName(displayName || user.email?.split("@")[0] || "Professor");
      setAuthorized(true);
    });
  }, [router]);

  const initials = useMemo(() => userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PR", [userName]);
  const filteredActivities = useMemo(() => activities.filter((activity) => `${activity.title} ${activity.component ?? ""} ${activity.school_year ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase())), [activities, searchTerm]);
  const publishedCount = activities.filter((activity) => activity.status === "published").length;
  const draftCount = activities.length - publishedCount;
  const responseCount = activities.reduce((total, activity) => total + activity.responseCount, 0);
  const metrics = [["Minhas atividades", activities.length, FileCheck2], ["Publicadas", publishedCount, Send], ["Rascunhos", draftCount, Clock3], ["Respostas recebidas", responseCount, Users]] as const;

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
      <label className="dashboardSearch"><Search /><input aria-label="Buscar atividade" placeholder="Buscar nas minhas atividades" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label>
      <div className="dashboardUser"><button aria-label="Notificações"><Bell /><i>1</i></button><span>{initials}</span><div className="userIdentity"><b>{userName}</b><small>{userEmail}</small></div><button className="logoutButton" onClick={logout} aria-label="Sair"><LogOut /></button></div>
    </header>
    <aside className="dashboardSidebar"><nav>{menu.map(([label, Icon], index) => {
      if (label === "Criar atividade") return <Link href="/professor/atividade/nova" key={label}><Icon />{label}</Link>;
      if (label === "Biblioteca") return <Link href="/biblioteca" key={label}><Icon />{label}</Link>;
      return <button className={index === 0 ? "active" : ""} key={label}><Icon />{label}</button>;
    })}</nav></aside>
    <section className="dashboardMain">
      <div className="welcomeRow"><div><h1>Olá, {userName.split(/\s+/)[0]}!</h1><p>Crie, personalize, publique e acompanhe atividades acessíveis.</p></div><span><ShieldCheck /> Dados reais e protegidos</span></div>
      <div className="quickActions">
        <Link className="quickAction create" href="/professor/atividade/nova"><FilePlus2 /><span><b>Criar nova atividade</b><small>Selecione o currículo e personalize para o estudante</small></span><ChevronRight /></Link>
        <button className="quickAction adapt" title="Módulo em desenvolvimento"><FileCode2 /><span><b>Adaptar material existente</b><small>Em desenvolvimento — próxima etapa do projeto</small></span><ChevronRight /></button>
        <Link className="quickAction library" href="/biblioteca"><BookOpen /><span><b>Abrir biblioteca</b><small>Explore atividades prontas por categoria</small></span><ChevronRight /></Link>
      </div>
      <div className="metricsGrid">{metrics.map(([label,value,Icon], index) => <article key={label}><span className={index===3?"purple":""}><Icon /></span><div><small>{label}</small><b>{value}</b></div></article>)}</div>
      <div className="sectionHeading"><h2>Minhas atividades</h2><span>{filteredActivities.length} encontrada(s)</span></div>
      {loadingActivities ? <div className="activityEmpty">Carregando suas atividades...</div> : filteredActivities.length === 0 ? <div className="activityEmpty"><FilePlus2/><h3>{activities.length ? "Nenhuma atividade corresponde à busca." : "Você ainda não criou uma atividade."}</h3>{!activities.length && <Link href="/professor/atividade/nova">Criar primeira atividade</Link>}</div> : <div className="activityGrid">{filteredActivities.map((activity,index) => <article className="activityCard" key={activity.id}>
        <div className="activityTop"><span className={activity.status === "published" ? "tag0" : "tag2"}>{activity.status === "published" ? "Publicada" : "Rascunho"}</span><small>{activity.responseCount} resposta(s)</small></div><div className={`activityArt art${index % 3}`}><FileCheck2 /></div>
        <h3>{activity.title}</h3><small>{[activity.school_year, activity.component].filter(Boolean).join(" • ") || "Atividade personalizada"}</small><p>{activity.description || "Sem descrição."}</p><div className="activityButtons"><Link href={`/professor/atividade/${activity.id}`}>{activity.status === "published" ? "Abrir e ver respostas" : "Continuar editando"}</Link>{activity.status === "published" && activity.access_code ? <Link href={`/estudante/atividade/${activity.access_code}`}>Ver como estudante</Link> : <span>Ainda não publicada</span>}</div>
      </article>)}</div>}
    </section>
    <aside className="aiSidebar"><div className="aiTitle"><h2>Assistente de IA</h2><ChevronDown /></div><section className="aiCard"><span className="botCircle"><Bot /></span><h3>Assistente conectado</h3><b className="online"><i /> Ativo</b><p>Receba sugestões de atividades, adaptações e objetivos de aprendizagem com base nas suas necessidades.</p><button><Sparkles /> Gerar com IA</button><small><Info /> Conteúdo sujeito à revisão do professor.</small></section><section className="tipCard"><Lightbulb /><div><h3>Dica do dia</h3><p>Atividades com exemplos do cotidiano tornam a aprendizagem mais significativa e inclusiva.</p></div></section><footer>DUDA — Estação Acessível • Versão preliminar • Material pedagógico independente</footer></aside>
  </main>;
}
