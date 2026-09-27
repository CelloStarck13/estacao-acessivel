"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpenCheck, ExternalLink, FileText, Search, Target } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./escopo.css";

type SourceDocument = { url: string; label: string; status?: string };
type PedagogicalUnit = {
  material_key: string;
  component: string;
  school_year: string;
  term: string;
  unit_title: string;
  domain: string | null;
  pedagogical_focus: string | null;
  learning_objectives: string[];
  core_concepts: string[];
  authentic_contexts: string[];
  activity_patterns: string[];
  assessment_evidence: string[];
  misconception_alerts: string[];
  source_documents: SourceDocument[];
  fidelity_status: string | null;
  ready_for_generation: boolean;
};

const yearOrder = ["6º ano","7º ano","8º ano","9º ano","1ª série","2ª série","3ª série"];

function sortYears(a:string,b:string){
  const ai=yearOrder.indexOf(a), bi=yearOrder.indexOf(b);
  if(ai===-1&&bi===-1) return a.localeCompare(b,"pt-BR");
  if(ai===-1) return 1;
  if(bi===-1) return -1;
  return ai-bi;
}

export default function EscopoCurricularPage(){
  const router=useRouter();
  const [authorized,setAuthorized]=useState(false);
  const [units,setUnits]=useState<PedagogicalUnit[]>([]);
  const [search,setSearch]=useState("");
  const [component,setComponent]=useState("all");
  const [year,setYear]=useState("all");
  const [term,setTerm]=useState("all");
  const [domain,setDomain]=useState("all");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    const supabase=createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async({data})=>{
      if(!data.session){router.replace("/professor");return;}
      const {data:rows,error:queryError}=await supabase
        .from("pedagogical_units")
        .select("material_key,component,school_year,term,unit_title,domain,pedagogical_focus,learning_objectives,core_concepts,authentic_contexts,activity_patterns,assessment_evidence,misconception_alerts,source_documents,fidelity_status,ready_for_generation")
        .order("component")
        .order("school_year")
        .order("term");
      if(queryError) setError("Não foi possível carregar o escopo curricular.");
      setUnits((rows??[]) as PedagogicalUnit[]);
      setAuthorized(true);
      setLoading(false);
    });
  },[router]);

  const components=useMemo(()=>Array.from(new Set(units.map(u=>u.component))).sort((a,b)=>a.localeCompare(b,"pt-BR")),[units]);
  const years=useMemo(()=>Array.from(new Set(units.map(u=>u.school_year))).sort(sortYears),[units]);
  const terms=useMemo(()=>Array.from(new Set(units.map(u=>u.term))).sort((a,b)=>a.localeCompare(b,"pt-BR")),[units]);
  const domains=useMemo(()=>Array.from(new Set(units.map(u=>u.domain).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,"pt-BR")),[units]);

  const filtered=useMemo(()=>{
    const s=search.trim().toLowerCase();
    return units.filter(u=>{
      const haystack=`${u.unit_title} ${u.component} ${u.school_year} ${u.term} ${u.domain??""} ${u.pedagogical_focus??""} ${(u.learning_objectives??[]).join(" ")} ${(u.core_concepts??[]).join(" ")}`.toLowerCase();
      return (!s||haystack.includes(s)) &&
        (component==="all"||u.component===component) &&
        (year==="all"||u.school_year===year) &&
        (term==="all"||u.term===term) &&
        (domain==="all"||u.domain===domain);
    });
  },[units,search,component,year,term,domain]);

  const grouped=useMemo(()=>{
    const map=new Map<string,PedagogicalUnit[]>();
    for(const unit of filtered){
      const key=`${unit.component} • ${unit.school_year}`;
      const current=map.get(key)??[];
      current.push(unit);
      map.set(key,current);
    }
    return Array.from(map.entries());
  },[filtered]);

  if(!authorized) return <main className="scopePage"><section className="scopeShell"><p>Verificando acesso...</p></section></main>;

  return <main className="scopePage"><section className="scopeShell">
    <header className="scopeHeader">
      <Link href="/professor/painel"><ArrowLeft size={18}/> Voltar ao painel</Link>
      <div><BookOpenCheck size={20}/><span>Escopo curricular</span></div>
    </header>

    <section className="scopeHero">
      <div>
        <small>DUDA — Estação Acessível</small>
        <h1>Escopo curricular 2026</h1>
        <p>Consulte unidades, objetivos, conceitos, evidências de aprendizagem e materiais de referência já usados pelo gerador do DUDA.</p>
      </div>
    </section>

    <div className="scopeSummary">
      <strong>{units.length} unidades catalogadas</strong>
      <span>{components.length} componente(s)</span>
      <span>{years.length} ano(s)/série(s)</span>
      <span>{filtered.length} resultado(s)</span>
    </div>

    <section className="scopeFilters">
      <label className="scopeSearch"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar unidade, objetivo, conceito ou tema"/></label>
      <select value={component} onChange={e=>setComponent(e.target.value)}><option value="all">Componente: todos</option>{components.map(v=><option key={v}>{v}</option>)}</select>
      <select value={year} onChange={e=>setYear(e.target.value)}><option value="all">Ano/série: todos</option>{years.map(v=><option key={v}>{v}</option>)}</select>
      <select value={term} onChange={e=>setTerm(e.target.value)}><option value="all">Bimestre: todos</option>{terms.map(v=><option key={v}>{v}</option>)}</select>
      <select value={domain} onChange={e=>setDomain(e.target.value)}><option value="all">Domínio: todos</option>{domains.map(v=><option key={v}>{v}</option>)}</select>
    </section>

    {(search||component!=="all"||year!=="all"||term!=="all"||domain!=="all")&&<div className="scopeActive">
      <span>{filtered.length} unidade(s) encontrada(s)</span>
      <button type="button" onClick={()=>{setSearch("");setComponent("all");setYear("all");setTerm("all");setDomain("all");}}>Limpar filtros</button>
    </div>}

    {error&&<div className="scopeError" role="alert">{error}</div>}

    {loading?<div className="scopeEmpty">Carregando escopo...</div>:filtered.length===0?<div className="scopeEmpty">Nenhuma unidade encontrada com estes filtros.</div>:<section className="scopeGroups">
      {grouped.map(([group,items])=><details className="scopeGroup" key={group}>
        <summary><span><strong>{group}</strong><small>{items.length} unidade(s)</small></span><b>Abrir</b></summary>
        <div className="scopeCards">
          {items.map(unit=><article className="scopeCard" key={unit.material_key}>
            <div className="scopeCardTop">
              <div>
                <span className="termBadge">{unit.term}</span>
                {unit.domain&&<span className="domainBadge">{unit.domain.replaceAll("_"," ")}</span>}
                <h2>{unit.unit_title}</h2>
              </div>
              <span className={unit.ready_for_generation?"ready":"pending"}>{unit.ready_for_generation?"Pronta para geração":"Em preparação"}</span>
            </div>

            {unit.pedagogical_focus&&<div className="scopeBlock"><h3><Target size={17}/> Foco pedagógico</h3><p>{unit.pedagogical_focus}</p></div>}

            {(unit.learning_objectives??[]).length>0&&<details className="innerDetails"><summary>Objetivos de aprendizagem ({unit.learning_objectives.length})</summary><ul>{unit.learning_objectives.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}
            {(unit.core_concepts??[]).length>0&&<details className="innerDetails"><summary>Conceitos centrais ({unit.core_concepts.length})</summary><div className="conceptTags">{unit.core_concepts.map((x,i)=><span key={i}>{x}</span>)}</div></details>}
            {(unit.activity_patterns??[]).length>0&&<details className="innerDetails"><summary>Padrões de atividade ({unit.activity_patterns.length})</summary><ul>{unit.activity_patterns.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}
            {(unit.assessment_evidence??[]).length>0&&<details className="innerDetails"><summary>Evidências de aprendizagem ({unit.assessment_evidence.length})</summary><ul>{unit.assessment_evidence.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}
            {(unit.authentic_contexts??[]).length>0&&<details className="innerDetails"><summary>Contextos autênticos ({unit.authentic_contexts.length})</summary><ul>{unit.authentic_contexts.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}
            {(unit.misconception_alerts??[]).length>0&&<details className="innerDetails warning"><summary>Cuidados pedagógicos ({unit.misconception_alerts.length})</summary><ul>{unit.misconception_alerts.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}

            {(unit.source_documents??[]).length>0&&<details className="innerDetails"><summary><FileText size={16}/> Materiais de referência ({unit.source_documents.length})</summary><div className="sourceList">{unit.source_documents.map((doc,i)=><a key={i} href={doc.url} target="_blank" rel="noreferrer"><span>{doc.label}</span><ExternalLink size={15}/></a>)}</div></details>}
          </article>)}
        </div>
      </details>)}
    </section>}
  </section></main>;
}
