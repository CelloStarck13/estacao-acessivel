"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileCheck2, FileText, Printer, Search, Table2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./exportacoes.css";

type Activity={id:string;title:string;description:string|null;component:string|null;school_year:string|null;term:string|null;learning_objective:string|null;status:string;access_code:string|null;created_at:string};
type Question={id:string;activity_id:string;position:number;prompt:string;question_type:string;options:string[];correct_answer:string|boolean|null;points:number};
type Submission={id:string;activity_id:string;participant_alias:string|null;score:number|null;max_score:number|null;completed_at:string};
type Answer={submission_id:string;question_id:string;answer:unknown;points_awarded:number|null;review_note:string|null};

function esc(v:unknown){return String(v??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c] as string));}
function showAnswer(v:unknown){if(v===null||v===undefined||v==="")return"Sem resposta";if(typeof v==="boolean")return v?"Verdadeiro":"Falso";if(typeof v==="string")return v;return JSON.stringify(v);}
function printWindow(title:string,body:string){
  const w=window.open("","_blank","noopener,noreferrer");
  if(!w)return false;
  const style="<style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#172033;line-height:1.45}h1{font-size:24px;margin:0 0 6px}h2{font-size:17px;margin:20px 0 8px}.meta{color:#5f6b7a;font-size:12px}.box{border:1px solid #d7dee8;border-radius:8px;padding:12px;margin:10px 0}.q{page-break-inside:avoid;border-top:1px solid #e3e8ef;padding:12px 0}.answer{background:#f5f8fc;padding:8px;border-radius:6px;margin-top:6px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ccd5e1;padding:6px;vertical-align:top}th{background:#f3f6fa;text-align:left}ul{padding-left:20px}</style>";
  w.document.write("<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>"+esc(title)+"</title>"+style+"</head><body>"+body+"<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>");
  w.document.close();return true;
}

export default function ExportacoesPage(){
  const router=useRouter();
  const[authorized,setAuthorized]=useState(false);
  const[activities,setActivities]=useState<Activity[]>([]);
  const[questions,setQuestions]=useState<Question[]>([]);
  const[submissions,setSubmissions]=useState<Submission[]>([]);
  const[answers,setAnswers]=useState<Answer[]>([]);
  const[selectedId,setSelectedId]=useState("");
  const[search,setSearch]=useState("");
  const[loading,setLoading]=useState(true);
  const[message,setMessage]=useState("");

  useEffect(()=>{const supabase=createBrowserSupabaseClient();void supabase.auth.getSession().then(async({data})=>{
    if(!data.session){router.replace("/professor");return;}
    const uid=data.session.user.id;
    const{data:acts,error}=await supabase.from("activities").select("id,title,description,component,school_year,term,learning_objective,status,access_code,created_at").eq("owner_id",uid).order("created_at",{ascending:false});
    if(error){setMessage("Não foi possível carregar suas atividades.");setAuthorized(true);setLoading(false);return;}
    const ar=(acts??[]) as Activity[];const ids=ar.map(a=>a.id);
    const results=ids.length?await Promise.all([
      supabase.from("questions").select("id,activity_id,position,prompt,question_type,options,correct_answer,points").in("activity_id",ids).order("position"),
      supabase.from("activity_submissions").select("id,activity_id,participant_alias,score,max_score,completed_at").in("activity_id",ids).order("completed_at",{ascending:false})
    ]):[{data:[]},{data:[]}];
    const qr=results[0].data??[],sr=results[1].data??[],sids=sr.map((s:any)=>s.id);
    const ans=sids.length?(await supabase.from("submission_answers").select("submission_id,question_id,answer,points_awarded,review_note").in("submission_id",sids)).data??[]:[];
    setActivities(ar);setQuestions(qr as Question[]);setSubmissions(sr as Submission[]);setAnswers(ans as Answer[]);setSelectedId(ar[0]?.id??"");setAuthorized(true);setLoading(false);
  });},[router]);

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return activities.filter(a=>!q||(a.title+" "+(a.component??"")+" "+(a.school_year??"")+" "+(a.term??"")).toLowerCase().includes(q));},[activities,search]);
  const selected=activities.find(a=>a.id===selectedId)??null;
  const qs=useMemo(()=>questions.filter(q=>q.activity_id===selectedId).sort((a,b)=>a.position-b.position),[questions,selectedId]);
  const subs=useMemo(()=>submissions.filter(s=>s.activity_id===selectedId),[submissions,selectedId]);

  function activityHtml(key:boolean){
    if(!selected)return"";
    const meta=[selected.component,selected.school_year,selected.term].filter(Boolean).join(" • ");
    const list=qs.map(q=>{
      const opts=(q.options??[]).length?"<ul>"+q.options.map(o=>"<li>"+esc(o)+"</li>").join("")+"</ul>":"";
      let correct=q.question_type==="open_text"?"Resposta aberta":q.correct_answer===true?"Verdadeiro":q.correct_answer===false?"Falso":q.correct_answer??"Sem gabarito objetivo";
      return "<div class='q'><strong>"+q.position+". "+esc(q.prompt)+"</strong><div class='meta'>"+esc(q.question_type.replaceAll("_"," "))+" • "+q.points+" ponto(s)</div>"+opts+(key?"<div class='answer'><strong>Gabarito:</strong> "+esc(correct)+"</div>":"")+"</div>";
    }).join("");
    return "<h1>"+esc(selected.title)+"</h1><div class='meta'>"+esc(meta)+"</div>"+(selected.description?"<p>"+esc(selected.description)+"</p>":"")+(selected.learning_objective?"<div class='box'><strong>Objetivo de aprendizagem</strong><p>"+esc(selected.learning_objective)+"</p></div>":"")+"<h2>"+(key?"Gabarito":"Atividade")+"</h2>"+(list||"<p>Nenhuma questão cadastrada.</p>");
  }

  function printActivity(){if(selected&&!printWindow(selected.title,activityHtml(false)))setMessage("O navegador bloqueou a janela. Autorize pop-ups e tente novamente.");}
  function printKey(){if(selected&&!printWindow("Gabarito - "+selected.title,activityHtml(true)))setMessage("O navegador bloqueou a janela. Autorize pop-ups e tente novamente.");}
  function printResponses(){
    if(!selected)return;
    const blocks=subs.map(s=>{
      const rows=qs.map(q=>{const a=answers.find(x=>x.submission_id===s.id&&x.question_id===q.id);return"<tr><td>"+q.position+"</td><td>"+esc(q.prompt)+"</td><td>"+esc(showAnswer(a?.answer))+"</td><td>"+esc(a?.points_awarded??"")+"</td><td>"+esc(a?.review_note??"")+"</td></tr>";}).join("");
      return"<div class='box'><h2>"+esc(s.participant_alias||"Identificação não informada")+"</h2><div class='meta'>"+new Date(s.completed_at).toLocaleString("pt-BR")+" • "+(s.score??0)+"/"+(s.max_score??0)+"</div><table><thead><tr><th>#</th><th>Questão</th><th>Resposta</th><th>Pontos</th><th>Feedback</th></tr></thead><tbody>"+rows+"</tbody></table></div>";
    }).join("");
    printWindow("Respostas - "+selected.title,"<h1>Relatório de respostas</h1><div class='meta'>"+esc(selected.title)+" • "+subs.length+" envio(s)</div>"+(blocks||"<p>Nenhuma resposta recebida.</p>"));
  }
  function exportCsv(){
    if(!selected)return;
    const header=["Identificação","Data e hora","Pontuação",...qs.map(q=>"Questão "+q.position+": "+q.prompt)];
    const rows=subs.map(s=>[s.participant_alias||"Não informado",new Date(s.completed_at).toLocaleString("pt-BR"),(s.score??0)+"/"+(s.max_score??0),...qs.map(q=>showAnswer(answers.find(a=>a.submission_id===s.id&&a.question_id===q.id)?.answer))]);
    const csv=[header,...rows].map(r=>r.map(c=>'"'+String(c).replaceAll('"','""')+'"').join(";")).join("\\n");
    const url=URL.createObjectURL(new Blob(["\\uFEFF",csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="respostas-"+(selected.access_code??selected.id)+".csv";a.click();URL.revokeObjectURL(url);
  }

  if(!authorized)return<main className="exportPage"><section className="exportShell"><p>Verificando acesso...</p></section></main>;
  return<main className="exportPage"><section className="exportShell">
    <header className="exportHeader"><Link href="/professor/painel"><ArrowLeft size={18}/> Voltar ao painel</Link><div><Download size={20}/><span>Exportações</span></div></header>
    <section className="exportHero"><small>DUDA — Estação Acessível</small><h1>Exportações</h1><p>Selecione uma atividade para imprimir, salvar em PDF ou exportar as respostas em CSV.</p></section>
    <section className="exportLayout">
      <aside className="activityPicker"><label className="exportSearch"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar atividade"/></label><div className="activityList">
        {loading?<p>Carregando...</p>:filtered.length===0?<p>Nenhuma atividade encontrada.</p>:filtered.map(a=><button key={a.id} type="button" className={selectedId===a.id?"active":""} onClick={()=>setSelectedId(a.id)}><strong>{a.title}</strong><span>{[a.school_year,a.component,a.term].filter(Boolean).join(" • ")||"Sem classificação"}</span><small>{a.status==="published"?"Publicada":"Rascunho"} • {new Date(a.created_at).toLocaleDateString("pt-BR")}</small></button>)}
      </div></aside>
      <section className="exportMain">{!selected?<div className="exportEmpty">Selecione uma atividade.</div>:<>
        <div className="selectedActivity"><span>{selected.status==="published"?"Publicada":"Rascunho"}</span><h2>{selected.title}</h2><p>{[selected.school_year,selected.component,selected.term].filter(Boolean).join(" • ")}</p><small>{qs.length} questão(ões) • {subs.length} resposta(s)</small></div>
        <div className="exportCards">
          <article><Printer/><div><h3>Atividade</h3><p>Versão limpa para impressão. Na janela do navegador você também pode escolher <strong>Salvar como PDF</strong>.</p></div><button onClick={printActivity}><Printer size={17}/> Imprimir / salvar PDF</button></article>
          <article><FileCheck2/><div><h3>Gabarito</h3><p>Atividade com as respostas corretas visíveis para uso do professor.</p></div><button onClick={printKey}><FileCheck2 size={17}/> Imprimir / salvar PDF</button></article>
          <article><FileText/><div><h3>Relatório de respostas</h3><p>Identificação, pontuação, respostas e feedback já registrados.</p></div><button onClick={printResponses} disabled={!subs.length}><FileText size={17}/> Imprimir relatório</button></article>
          <article><Table2/><div><h3>Respostas em CSV</h3><p>Planilha com uma linha por envio e uma coluna por questão.</p></div><button onClick={exportCsv} disabled={!subs.length}><Download size={17}/> Baixar CSV</button></article>
        </div>
        <div className="exportNote"><strong>PDF nesta V1:</strong> o DUDA usa a impressão nativa do navegador. Basta escolher “Salvar como PDF”. Isso funciona sem biblioteca adicional e sem alterar o banco.</div>
      </>}
      {message&&<div className="exportMessage">{message}</div>}</section>
    </section>
  </section></main>;
}
