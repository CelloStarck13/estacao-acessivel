"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, Printer, ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./detalhe.css";

type PublicQuestion={
  id:string;position:number;prompt:string;question_type:string;options:string[];
  accessibility_support:string|null;points:number;media_url:string|null;media_alt:string|null;media_caption:string|null;
};
type PublicActivity={
  id:string;title:string;description:string|null;component:string|null;school_year:string|null;term:string|null;theme:string|null;
  learning_objective:string|null;support_needs:string[];response_modes:string[];access_code:string|null;published_at:string|null;
  questions:PublicQuestion[];
};

export default function BibliotecaDetalhePage(){
  const params=useParams<{id:string}>();
  const[item,setItem]=useState<PublicActivity|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");

  useEffect(()=>{const supabase=createBrowserSupabaseClient();void supabase.rpc("get_public_library_activity",{p_activity_id:params.id}).then(({data,error})=>{
    if(error||!data)setError("Esta atividade não está disponível na biblioteca pública.");
    else setItem(data as PublicActivity);
    setLoading(false);
  });},[params.id]);

  return <main className="publicDetailPage"><Header/><section className="publicDetailShell">
    <div className="publicDetailNav"><Link href="/biblioteca"><ArrowLeft size={18}/> Voltar à biblioteca</Link>{item&&<button onClick={()=>window.print()}><Printer size={17}/> Imprimir</button>}</div>

    {loading?<div className="publicDetailEmpty">Carregando atividade...</div>:error?<div className="publicDetailEmpty">{error}</div>:item&&<>
      <section className="publicDetailHero">
        <div><span>Atividade pública</span><h1>{item.title}</h1><p>{item.description||"Atividade publicada no DUDA."}</p><div className="publicMeta">{[item.component,item.school_year,item.term].filter(Boolean).map(v=><b key={v}>{v}</b>)}</div></div>
        <BookOpen size={54}/>
      </section>

      {item.learning_objective&&<section className="publicBlock"><h2>Objetivo de aprendizagem</h2><p>{item.learning_objective}</p></section>}

      {(item.support_needs??[]).length>0&&<section className="publicBlock"><h2><ShieldCheck size={20}/> Recursos de acessibilidade</h2><div className="publicSupportTags">{item.support_needs.map(tag=><span key={tag}>{tag}</span>)}</div></section>}

      <section className="publicBlock"><div className="publicQuestionsTitle"><div><h2>Questões</h2><p>{item.questions.length} questão(ões) nesta atividade.</p></div>{item.access_code&&<Link className="studentAccess" href={"/estudante/atividade/"+item.access_code}><ExternalLink size={17}/> Acessar com código</Link>}</div>
        <div className="publicQuestions">{item.questions.map(q=><article key={q.id}><div className="questionNumber">{q.position}</div><div><h3>{q.prompt}</h3><small>{q.points} ponto(s)</small>{(q.options??[]).length>0&&<ul>{q.options.map(option=><li key={option}>{option}</li>)}</ul>}{q.accessibility_support&&<p className="accessHint"><strong>Apoio acessível:</strong> {q.accessibility_support}</p>}</div></article>)}</div>
      </section>
    </>}
  </section></main>;
}
