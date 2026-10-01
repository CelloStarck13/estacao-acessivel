"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Search, Target } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { canonicalComponents, normalizeSchoolYear, sortSchoolYears } from "@/lib/curriculum-normalization";
import "./escopo.css";

type CurriculumItem = {
  id: string;
  component: string;
  school_year: string;
  term: string;
  theme: string | null;
  learning_objective: string | null;
  skill_reference: string | null;
  source_reference: string | null;
  cycle: string | null;
  week_label: string | null;
  date_label: string | null;
  unit: string | null;
  unit_lesson: string | null;
  classroom_lesson: string | null;
  lesson_format: string | null;
  contents: string | null;
  skill_text: string | null;
  knowledge_object: string | null;
  project_delivery: string | null;
  skill_codes: string[] | null;
};

function cleanText(value:string|null){
  return (value??"").replace(/^[-•●]\s*/gm,"").trim();
}

export default function EscopoCurricularPage(){
  const router=useRouter();
  const [authorized,setAuthorized]=useState(false);
  const [items,setItems]=useState<CurriculumItem[]>([]);
  const [search,setSearch]=useState("");
  const [component,setComponent]=useState("all");
  const [year,setYear]=useState("all");
  const [term,setTerm]=useState("all");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    const supabase=createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async({data})=>{
      if(!data.session){router.replace("/professor");return;}
      const {data:rows,error:queryError}=await supabase
        .from("curriculum_items")
        .select("id,component,school_year,term,theme,learning_objective,skill_reference,source_reference,cycle,week_label,date_label,unit,unit_lesson,classroom_lesson,lesson_format,contents,skill_text,knowledge_object,project_delivery,skill_codes")
        .order("component")
        .order("school_year")
        .order("term")
        .order("theme");
      if(queryError) setError("Não foi possível carregar o escopo curricular.");
      setItems((rows??[]) as CurriculumItem[]);
      setAuthorized(true);
      setLoading(false);
    });
  },[router]);

  const components=useMemo(()=>canonicalComponents.filter(value=>items.some(i=>i.component===value)),[items]);
  const years=useMemo(()=>Array.from(new Set(items.map(i=>normalizeSchoolYear(i.school_year)))).sort(sortSchoolYears),[items]);
  const terms=useMemo(()=>Array.from(new Set(items.map(i=>i.term))).sort((a,b)=>a.localeCompare(b,"pt-BR")),[items]);

  const filtered=useMemo(()=>{
    const s=search.trim().toLowerCase();
    return items.filter(item=>{
      const haystack=`${item.theme??""} ${item.learning_objective??""} ${item.contents??""} ${item.knowledge_object??""} ${item.skill_reference??""} ${item.skill_text??""} ${item.component} ${item.school_year} ${item.term}`.toLowerCase();
      return (!s||haystack.includes(s)) &&
        (component==="all"||item.component===component) &&
        (year==="all"||normalizeSchoolYear(item.school_year)===year) &&
        (term==="all"||item.term===term);
    });
  },[items,search,component,year,term]);

  const grouped=useMemo(()=>{
    const map=new Map<string,CurriculumItem[]>();
    for(const item of filtered){
      const key=`${item.component} • ${normalizeSchoolYear(item.school_year)}`;
      const current=map.get(key)??[];
      current.push(item);
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
        <p>Consulte os temas e objetivos previstos para Tecnologia e Inovação, Programação e Robótica, organizados por ano/série e bimestre.</p>
      </div>
    </section>

    <div className="scopeSummary">
      <strong>{items.length} registros curriculares</strong>
      <span>{components.length} componentes</span>
      <span>{years.length} anos/séries</span>
      <span>{filtered.length} resultado(s)</span>
    </div>

    <section className="scopeFilters">
      <label className="scopeSearch"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar tema, objetivo, conteúdo ou habilidade"/></label>
      <select value={component} onChange={e=>setComponent(e.target.value)}><option value="all">Componente: todos</option>{components.map(v=><option key={v}>{v}</option>)}</select>
      <select value={year} onChange={e=>setYear(e.target.value)}><option value="all">Ano/série: todos</option>{years.map(v=><option key={v}>{v}</option>)}</select>
      <select value={term} onChange={e=>setTerm(e.target.value)}><option value="all">Bimestre: todos</option>{terms.map(v=><option key={v}>{v}</option>)}</select>
    </section>

    {(search||component!=="all"||year!=="all"||term!=="all")&&<div className="scopeActive">
      <span>{filtered.length} registro(s) encontrado(s)</span>
      <button type="button" onClick={()=>{setSearch("");setComponent("all");setYear("all");setTerm("all");}}>Limpar filtros</button>
    </div>}

    {error&&<div className="scopeError" role="alert">{error}</div>}

    {loading?<div className="scopeEmpty">Carregando escopo...</div>:filtered.length===0?<div className="scopeEmpty">Nenhum registro encontrado com estes filtros.</div>:<section className="scopeGroups">
      {grouped.map(([group,rows])=><details className="scopeGroup" key={group}>
        <summary><span><strong>{group}</strong><small>{rows.length} registro(s)</small></span><b>Abrir</b></summary>
        <div className="scopeCards">
          {rows.map(item=><article className="scopeCard" key={item.id}>
            <div className="scopeCardTop">
              <div>
                <span className="termBadge">{item.term}</span>
                {item.week_label&&<span className="domainBadge">{item.week_label}</span>}
                <h2>{item.theme || item.unit || "Registro curricular"}</h2>
              </div>
            </div>

            {item.learning_objective&&<div className="scopeBlock"><h3><Target size={17}/> Objetivo de aprendizagem</h3><p>{cleanText(item.learning_objective)}</p></div>}

            {item.knowledge_object&&<details className="innerDetails"><summary>Objeto de conhecimento</summary><p>{cleanText(item.knowledge_object)}</p></details>}
            {item.contents&&<details className="innerDetails"><summary>Conteúdos</summary><p>{cleanText(item.contents)}</p></details>}
            {(item.skill_reference||item.skill_text||(item.skill_codes??[]).length>0)&&<details className="innerDetails"><summary>Habilidade / referência curricular</summary>
              {item.skill_reference&&<p><strong>Referência:</strong> {cleanText(item.skill_reference)}</p>}
              {(item.skill_codes??[]).length>0&&<div className="conceptTags">{item.skill_codes!.map(code=><span key={code}>{code}</span>)}</div>}
              {item.skill_text&&<p>{cleanText(item.skill_text)}</p>}
            </details>}
            {(item.unit||item.unit_lesson||item.classroom_lesson||item.lesson_format)&&<details className="innerDetails"><summary>Organização da aula</summary>
              {item.unit&&<p><strong>Unidade:</strong> {cleanText(item.unit)}</p>}
              {item.unit_lesson&&<p><strong>Aula da unidade:</strong> {item.unit_lesson}</p>}
              {item.classroom_lesson&&<p><strong>Aula:</strong> {item.classroom_lesson}</p>}
              {item.lesson_format&&<p><strong>Formato:</strong> {item.lesson_format}</p>}
            </details>}
            {item.project_delivery&&<details className="innerDetails"><summary>Entrega / projeto</summary><p>{cleanText(item.project_delivery)}</p></details>}
            {item.source_reference&&<details className="innerDetails"><summary>Fonte curricular</summary><p>{item.source_reference}</p></details>}
          </article>)}
        </div>
      </details>)}
    </section>}
  </section></main>;
}
