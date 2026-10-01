"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Filter, Search, SlidersHorizontal } from "lucide-react";
import { Header } from "@/components/header";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { canonicalComponents, normalizeSchoolYear, sortSchoolYears } from "@/lib/curriculum-normalization";
import "./biblioteca.css";

type PublicActivity={
  id:string;title:string;description:string|null;component:string|null;school_year:string|null;term:string|null;
  theme:string|null;learning_objective:string|null;support_needs:string[];response_modes:string[];
  access_code:string|null;published_at:string|null;question_count:number;
};

export default function BibliotecaPage(){
  const router=useRouter();
  const[items,setItems]=useState<PublicActivity[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[search,setSearch]=useState("");
  const[component,setComponent]=useState("all");
  const[year,setYear]=useState("all");
  const[term,setTerm]=useState("all");
  const[accessibility,setAccessibility]=useState("all");

  useEffect(()=>{const supabase=createBrowserSupabaseClient();void supabase.rpc("get_public_library").then(({data,error})=>{if(error)setError("Não foi possível carregar a biblioteca pública.");setItems((data??[]) as PublicActivity[]);setLoading(false);});},[]);

  const components=canonicalComponents;
  const years=useMemo(()=>Array.from(new Set(items.map(i=>normalizeSchoolYear(i.school_year)).filter(Boolean))).sort(sortSchoolYears),[items]);
  const terms=useMemo(()=>Array.from(new Set(items.map(i=>i.term).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,"pt-BR")),[items]);

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return items.filter(i=>{
    const haystack=(i.title+" "+(i.theme??"")+" "+(i.description??"")+" "+(i.learning_objective??"")).toLowerCase();
    const hasAccess=(i.support_needs??[]).length>0;
    return(!q||haystack.includes(q))&&(component==="all"||i.component===component)&&(year==="all"||normalizeSchoolYear(i.school_year)===year)&&(term==="all"||i.term===term)&&(accessibility==="all"||(accessibility==="with"&&hasAccess)||(accessibility==="without"&&!hasAccess));
  });},[items,search,component,year,term,accessibility]);

  function clear(){setSearch("");setComponent("all");setYear("all");setTerm("all");setAccessibility("all");}

  return <main className="libraryPage"><Header/><section className="libraryHero"><div><span className="libraryTag">Biblioteca pública</span><h1>Atividades revisadas e publicadas</h1><p>Encontre atividades de Tecnologia e Inovação, Programação e Robótica já publicadas no DUDA.</p></div></section>
    <section className="libraryShell">
      <button type="button" className="libraryBack" onClick={()=>router.back()}><ArrowLeft size={18}/> Voltar</button>
      <div className="libraryFilters">
        <label className="librarySearch"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, tema ou objetivo"/></label>
        <select value={component} onChange={e=>setComponent(e.target.value)}><option value="all">Componente: todos</option>{components.map(v=><option key={v}>{v}</option>)}</select>
        <select value={year} onChange={e=>setYear(e.target.value)}><option value="all">Ano/série: todos</option>{years.map(v=><option key={v}>{v}</option>)}</select>
        <select value={term} onChange={e=>setTerm(e.target.value)}><option value="all">Bimestre: todos</option>{terms.map(v=><option key={v}>{v}</option>)}</select>
        <select value={accessibility} onChange={e=>setAccessibility(e.target.value)}><option value="all">Acessibilidade: todas</option><option value="with">Com apoio acessível</option><option value="without">Sem apoio específico</option></select>
      </div>

      <div className="libraryResultLine"><span><Filter size={16}/><strong>{filtered.length}</strong> atividade(s) encontrada(s)</span>{(search||component!=="all"||year!=="all"||term!=="all"||accessibility!=="all")&&<button onClick={clear}><SlidersHorizontal size={16}/> Limpar filtros</button>}</div>

      {error&&<div className="libraryEmpty">{error}</div>}
      {loading?<div className="libraryEmpty">Carregando biblioteca...</div>:filtered.length===0?<div className="libraryEmpty">Nenhuma atividade encontrada com estes filtros.</div>:<div className="libraryGrid">{filtered.map(item=><article className="libraryCard" key={item.id}>
        <div className="libraryCardTop"><span>{item.component||"Atividade"}</span><small>{item.question_count} questão(ões)</small></div>
        <h2>{item.title}</h2>
        <p className="libraryMeta">{[normalizeSchoolYear(item.school_year),item.term].filter(Boolean).join(" • ")}</p>
        <p className="libraryDescription">{item.description||item.learning_objective||"Atividade publicada no DUDA."}</p>
        {(item.support_needs??[]).length>0&&<div className="supportTags">{item.support_needs.slice(0,4).map(tag=><span key={tag}>{tag}</span>)}</div>}
        <div className="libraryCardFooter"><small>{item.published_at?"Publicada em "+new Date(item.published_at).toLocaleDateString("pt-BR"):"Publicada"}</small><Link href={"/biblioteca/"+item.id}><BookOpen size={17}/> Ver atividade</Link></div>
      </article>)}</div>}
    </section>
  </main>;
}
