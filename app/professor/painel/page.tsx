"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./painel.css";
import { Accessibility, Bell, BookOpen, Bot, CheckSquare, ChevronDown, ChevronRight, CirclePlus, Clock3, FileCheck2, FileCode2, FilePlus2, Gamepad2, House, Info, Lightbulb, MoreVertical, Printer, Search, Settings, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const menu = [
  ["Início", House], ["Criar atividade", CirclePlus], ["Adaptar material", FileCode2],
  ["Biblioteca", BookOpen], ["Escopo curricular", FileCheck2], ["Acessibilidade", Accessibility],
  ["Gabaritos", CheckSquare], ["Exportações", Upload], ["Configurações", Settings],
] as const;

const metrics = [["Atividades", "128", FileCheck2], ["Interativas", "42", Gamepad2], ["Para impressão", "86", Printer], ["Em revisão", "5", Clock3]] as const;

const activities = [
  ["Digital", "Missão do Robô", "8º ano • Algoritmos", "Desafios de lógica e sequências para programar o robô.", Bot],
  ["Impressa", "Detetive de Erros", "9º ano • Programação", "Encontre e corrija erros no código com desafios progressivos.", Search],
  ["Revisar", "Página Web Acessível", "Ensino Médio • HTML", "Crie uma página web inclusiva seguindo boas práticas de acessibilidade.", Accessibility],
] as const;

export default function ProfessorDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/professor");
        return;
      }
      setAuthorized(true);
    });
  }, [router]);

  if (!authorized) {
    return <main className="authPage"><section className="authPanel"><p>Verificando acesso...</p></section></main>;
  }

  return <main className="dashboardShell">
    <header className="dashboardTopbar">
      <Link href="/" className="dashboardBrand"><span><BookOpen /></span><b><strong>DUDA</strong> — Estação <em>Acessível</em><small>Tecnologia, Programação e Robótica</small></b></Link>
      <label className="dashboardSearch"><Search /><input aria-label="Buscar atividade" placeholder="Buscar atividade" /></label>
      <div className="dashboardUser"><button aria-label="Notificações"><Bell /><i>1</i></button><span>MS</span><b>Marcelo Silva</b><ChevronDown /></div>
    </header>
    <aside className="dashboardSidebar"><nav>{menu.map(([label, Icon], index) => label === "Biblioteca" ? <Link href="/biblioteca" key={label}><Icon />{label}</Link> : <button className={index === 0 ? "active" : ""} key={label}><Icon />{label}</button>)}</nav></aside>
    <section className="dashboardMain">
      <div className="welcomeRow"><div><h1>Olá, Marcelo!</h1><p>Crie, adapte e compartilhe atividades acessíveis.</p></div><span><ShieldCheck /> Ambiente de demonstração</span></div>
      <div className="quickActions">
        <button className="quickAction create"><FilePlus2 /><span><b>Criar nova atividade</b><small>Do zero, com apoio e sugestões</small></span><ChevronRight /></button>
        <button className="quickAction adapt"><FileCode2 /><span><b>Adaptar material existente</b><small>Transforme conteúdos em atividades acessíveis</small></span><ChevronRight /></button>
        <Link className="quickAction library" href="/biblioteca"><BookOpen /><span><b>Abrir biblioteca</b><small>Explore atividades prontas por categoria</small></span><ChevronRight /></Link>
      </div>
      <div className="metricsGrid">{metrics.map(([label,value,Icon], index) => <article key={label}><span className={index===3?"purple":""}><Icon /></span><div><small>{label}</small><b>{value}</b></div></article>)}</div>
      <div className="sectionHeading"><h2>Continuar trabalhando</h2><button>Ver todas as atividades <ChevronRight /></button></div>
      <div className="activityGrid">{activities.map(([badge,title,meta,text,Icon],index) => <article className="activityCard" key={title}>
        <div className="activityTop"><span className={`tag${index}`}>{badge}</span><MoreVertical /></div><div className={`activityArt art${index}`}><Icon /></div>
        <h3>{title}</h3><small>{meta}</small><p>{text}</p><div className="activityButtons"><button>Abrir</button><button><FileCheck2 /> Gerar PDF</button></div>
      </article>)}</div>
    </section>
    <aside className="aiSidebar"><div className="aiTitle"><h2>Assistente de IA</h2><ChevronDown /></div><section className="aiCard"><span className="botCircle"><Bot /></span><h3>Assistente conectado</h3><b className="online"><i /> Ativo</b><p>Receba sugestões de atividades, adaptações e objetivos de aprendizagem com base nas suas necessidades.</p><button><Sparkles /> Gerar com IA</button><small><Info /> Conteúdo sujeito à revisão do professor.</small></section><section className="tipCard"><Lightbulb /><div><h3>Dica do dia</h3><p>Atividades com exemplos do cotidiano tornam a aprendizagem mais significativa e inclusiva.</p></div></section><footer>DUDA — Estação Acessível • Versão preliminar • Material pedagógico independente</footer></aside>
  </main>;
}
