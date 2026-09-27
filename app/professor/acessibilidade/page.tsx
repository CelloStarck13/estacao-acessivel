"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Accessibility, AlertTriangle, CheckCircle2, Eye, Hand, MessageSquareText, Search, ShieldCheck, Sparkles } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./acessibilidade.css";

type Strategy = {
  strategy_key: string;
  profile: string;
  access_barriers: string[];
  presentation_supports: string[];
  action_expression_supports: string[];
  engagement_supports: string[];
  prohibited_shortcuts: string[];
  validation_notes: string | null;
  source_status: string | null;
};

type SupportFilter = "all" | "barriers" | "presentation" | "action" | "engagement" | "care";

const supportLabels: Record<SupportFilter,string> = {
  all:"Todos os apoios",
  barriers:"Barreiras de acesso",
  presentation:"Apresentação do conteúdo",
  action:"Forma de resposta",
  engagement:"Engajamento e participação",
  care:"Cuidados pedagógicos",
};

function includesSearch(strategy: Strategy, value: string){
  const haystack=[
    strategy.profile,
    ...(strategy.access_barriers??[]),
    ...(strategy.presentation_supports??[]),
    ...(strategy.action_expression_supports??[]),
    ...(strategy.engagement_supports??[]),
    ...(strategy.prohibited_shortcuts??[]),
    strategy.validation_notes??"",
  ].join(" ").toLowerCase();
  return haystack.includes(value.toLowerCase());
}

export default function AcessibilidadePage(){
  const router=useRouter();
  const [authorized,setAuthorized]=useState(false);
  const [strategies,setStrategies]=useState<Strategy[]>([]);
  const [search,setSearch]=useState("");
  const [profile,setProfile]=useState("all");
  const [support,setSupport]=useState<SupportFilter>("all");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    const supabase=createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async({data})=>{
      if(!data.session){router.replace("/professor");return;}
      const {data:rows,error:queryError}=await supabase
        .from("accessibility_strategies")
        .select("strategy_key,profile,access_barriers,presentation_supports,action_expression_supports,engagement_supports,prohibited_shortcuts,validation_notes,source_status")
        .order("profile");
      if(queryError) setError("Não foi possível carregar as estratégias de acessibilidade.");
      setStrategies((rows??[]) as Strategy[]);
      setAuthorized(true);
      setLoading(false);
    });
  },[router]);

  const profiles=useMemo(()=>strategies.map(item=>item.profile),[strategies]);

  const filtered=useMemo(()=>{
    const q=search.trim();
    return strategies.filter(item=>(profile==="all"||item.profile===profile)&&(!q||includesSearch(item,q)));
  },[strategies,profile,search]);

  function clearFilters(){setSearch("");setProfile("all");setSupport("all");}

  if(!authorized) return <main className="accessPage"><section className="accessShell"><p>Verificando acesso...</p></section></main>;

  return <main className="accessPage"><section className="accessShell">
    <header className="accessHeader">
      <Link href="/professor/painel"><ArrowLeft size={18}/> Voltar ao painel</Link>
      <div><Accessibility size={20}/><span>Acessibilidade</span></div>
    </header>

    <section className="accessHero">
      <div>
        <small>DUDA — Estação Acessível</small>
        <h1>Estratégias de acessibilidade</h1>
        <p>Consulte apoios pedagógicos para remover barreiras sem reduzir o objetivo curricular da atividade.</p>
      </div>
      <div className="heroPrinciple"><ShieldCheck/><span><strong>Princípio da tela</strong> Adaptar o acesso, não empobrecer a aprendizagem.</span></div>
    </section>

    <div className="accessSummary">
      <strong>{strategies.length} perfis com estratégias revisadas</strong>
      <span>{filtered.length} resultado(s)</span>
      <span>consulta pedagógica</span>
    </div>

    <section className="accessFilters">
      <label className="accessSearch"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar barreira, apoio ou estratégia"/></label>
      <select value={profile} onChange={e=>setProfile(e.target.value)}>
        <option value="all">Perfil/condição: todos</option>
        {profiles.map(value=><option key={value} value={value}>{value}</option>)}
      </select>
      <select value={support} onChange={e=>setSupport(e.target.value as SupportFilter)}>
        {(Object.keys(supportLabels) as SupportFilter[]).map(key=><option key={key} value={key}>{supportLabels[key]}</option>)}
      </select>
    </section>

    {(search||profile!=="all"||support!=="all")&&<div className="accessActive">
      <span>{filtered.length} perfil(is) encontrado(s)</span>
      <button type="button" onClick={clearFilters}>Limpar filtros</button>
    </div>}

    <div className="accessInfo"><Sparkles size={18}/><span>Use esta tela como referência para planejar a mediação. A estratégia deve ser combinada com o estudante, a equipe pedagógica e o AEE quando houver.</span></div>

    {error&&<div className="accessError" role="alert">{error}</div>}

    {loading?<div className="accessEmpty">Carregando estratégias...</div>:filtered.length===0?<div className="accessEmpty">Nenhuma estratégia encontrada com estes filtros.</div>:<section className="strategyList">
      {filtered.map(item=><article className="strategyCard" key={item.strategy_key}>
        <div className="strategyTop">
          <div><span className="reviewBadge"><CheckCircle2 size={14}/> Revisão pedagógica</span><h2>{item.profile}</h2></div>
        </div>

        {(support==="all"||support==="barriers")&&<section className="strategySection barrier">
          <h3><AlertTriangle size={17}/> Barreiras que podem dificultar o acesso</h3>
          <div className="tagList">{(item.access_barriers??[]).map(value=><span key={value}>{value}</span>)}</div>
        </section>}

        {(support==="all"||support==="presentation")&&<section className="strategySection">
          <h3><Eye size={17}/> Como apresentar o conteúdo</h3>
          <ul>{(item.presentation_supports??[]).map(value=><li key={value}>{value}</li>)}</ul>
        </section>}

        {(support==="all"||support==="action")&&<section className="strategySection">
          <h3><MessageSquareText size={17}/> Formas de ação e resposta</h3>
          <ul>{(item.action_expression_supports??[]).map(value=><li key={value}>{value}</li>)}</ul>
        </section>}

        {(support==="all"||support==="engagement")&&<section className="strategySection">
          <h3><Hand size={17}/> Engajamento e participação</h3>
          <ul>{(item.engagement_supports??[]).map(value=><li key={value}>{value}</li>)}</ul>
        </section>}

        {(support==="all"||support==="care")&&<section className="strategySection caution">
          <h3><AlertTriangle size={17}/> Evite estes atalhos</h3>
          <ul>{(item.prohibited_shortcuts??[]).map(value=><li key={value}>{value}</li>)}</ul>
          {item.validation_notes&&<div className="validationNote"><strong>Validação pedagógica</strong><p>{item.validation_notes}</p></div>}
        </section>}
      </article>)}
    </section>}
  </section></main>;
}
