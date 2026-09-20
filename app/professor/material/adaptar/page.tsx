"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Save, Sparkles, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { adaptExistingMaterial, type MaterialAdaptationResult } from "@/lib/material-adapter";
import "./adaptar.css";

const profileOptions = ["TEA","Síndrome de Down","Deficiência intelectual","Cegueira","Baixa visão","Surdez","Deficiência auditiva","Surdocegueira","Deficiência física","Deficiência múltipla","Altas habilidades / superdotação","TDAH / atenção e autorregulação","Transtorno específico de aprendizagem"];
const supportOptions = ["Linguagem objetiva","Uma etapa por vez","Apoio visual","Rotina previsível","Leitura em voz alta","Libras","Descrição textual de imagens","Alto contraste / ampliação","Redução de carga cognitiva","Exemplos concretos","Tempo ampliado","Menos estímulos visuais","Pistas graduais","Repetição / retomada","Tecnologia assistiva","Mediação do professor / AEE"];
const communicationOptions = ["Língua Portuguesa escrita","Libras","Comunicação oral","Comunicação alternativa / aumentativa","Mediação por parceiro de comunicação"];
const responseOptions = ["Seleção","Texto","Áudio","Desenho","Imagem","Material impresso"];

function toggle(value:string, list:string[], setter:(next:string[])=>void){ setter(list.includes(value)?list.filter((item)=>item!==value):[...list,value]); }

export default function AdaptarMaterialPage(){
  const router=useRouter();
  const [authorized,setAuthorized]=useState(false);
  const [title,setTitle]=useState("");
  const [sourceText,setSourceText]=useState("");
  const [fileName,setFileName]=useState("");
  const [loadingFile,setLoadingFile]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [profiles,setProfiles]=useState<string[]>([]);
  const [supports,setSupports]=useState<string[]>(["Linguagem objetiva"]);
  const [communication,setCommunication]=useState<string[]>(["Língua Portuguesa escrita"]);
  const [autonomy,setAutonomy]=useState("moderate");
  const [responses,setResponses]=useState<string[]>(["Seleção","Texto"]);
  const [result,setResult]=useState<MaterialAdaptationResult|null>(null);

  useEffect(()=>{ const supabase=createBrowserSupabaseClient(); void supabase.auth.getSession().then(({data})=>{if(!data.session){router.replace("/professor");return;} setAuthorized(true);});},[router]);

  const canGenerate=useMemo(()=>sourceText.trim().length>=80 && title.trim().length>2,[sourceText,title]);

  async function readFile(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]; if(!file)return;
    setLoadingFile(true); setMessage("Lendo o material...");
    try{
      const body=new FormData(); body.append("file",file);
      const response=await fetch("/api/material/extract",{method:"POST",body});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Falha ao ler o arquivo.");
      setSourceText(data.text); setFileName(data.fileName); if(!title.trim()) setTitle(data.fileName.replace(/\.[^.]+$/,""));
      setMessage(data.truncated?"Texto extraído. O arquivo foi limitado aos primeiros 120 mil caracteres.":"Texto extraído com sucesso.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível ler o arquivo.");}
    finally{setLoadingFile(false); event.target.value="";}
  }

  function generate(){
    if(!canGenerate){setMessage("Informe um título e um material com conteúdo suficiente.");return;}
    const adapted=adaptExistingMaterial({title,originalText:sourceText,learnerProfiles:profiles,supportNeeds:supports,communicationModes:communication,autonomyLevel:autonomy,responseModes:responses});
    setResult(adapted); setMessage("Adaptação gerada. Revise antes de salvar.");
    window.setTimeout(()=>document.getElementById("resultado")?.scrollIntoView({behavior:"smooth"}),50);
  }

  async function save(){
    if(!result)return;
    setSaving(true);
    const supabase=createBrowserSupabaseClient();
    const {data:session}=await supabase.auth.getSession();
    if(!session.session){setMessage("Sua sessão expirou.");setSaving(false);return;}
    const {error}=await supabase.from("material_adaptations").insert({
      owner_id:session.session.user.id,title:result.title,source_file_name:fileName||null,source_type:fileName?(fileName.split(".").pop()?.toLowerCase()||"file"):"text",
      original_text:sourceText,learner_profiles:profiles,support_needs:supports,communication_modes:communication,autonomy_level:autonomy,response_modes:responses,adapted_payload:result,status:"draft"
    });
    setMessage(error?"Não foi possível salvar: "+error.message:"Material adaptado salvo como rascunho.");
    setSaving(false);
  }

  if(!authorized)return <main className="authPage"><section className="authPanel"><p>Verificando acesso...</p></section></main>;

  return <main className="adaptPage"><section className="adaptShell">
    <header className="adaptHeader"><Link href="/professor/painel"><ArrowLeft/> Voltar ao painel</Link><span>DUDA — Adaptar material existente</span></header>
    <section className="adaptCard">
      <div className="adaptTitle"><div><h1>Adaptar material existente</h1><p>Envie um material que você já usa. O DUDA reorganiza o acesso sem substituir o objetivo pedagógico.</p></div><FileText/></div>
      <div className="adaptSection"><h2>1. Adicione o material</h2>
        <label>Título do material<input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Ex.: Introdução à lógica de programação"/></label>
        <label className="uploadBox"><UploadCloud/><b>{loadingFile?"Lendo arquivo...":"Enviar PDF, DOCX, TXT ou MD"}</b><span>até 10 MB • o arquivo é lido para extrair o texto</span><input type="file" accept=".pdf,.docx,.txt,.md,text/plain,application/pdf" onChange={readFile} disabled={loadingFile}/></label>
        {fileName&&<small className="fileOk">Arquivo carregado: {fileName}</small>}
        <label>Ou cole o conteúdo<textarea rows={10} value={sourceText} onChange={(e)=>setSourceText(e.target.value)} placeholder="Cole aqui o texto, enunciado, roteiro, atividade ou material de apoio..."/></label>
      </div>

      <div className="adaptSection"><h2>2. Personalize o acesso</h2>
        <h3>Perfil / condição informado</h3><div className="optionGrid">{profileOptions.map((item)=><label className={profiles.includes(item)?"selected":""} key={item}><input type="checkbox" checked={profiles.includes(item)} onChange={()=>toggle(item,profiles,setProfiles)}/>{item}</label>)}</div>
        <h3>Apoios necessários</h3><div className="optionGrid">{supportOptions.map((item)=><label className={supports.includes(item)?"selected":""} key={item}><input type="checkbox" checked={supports.includes(item)} onChange={()=>toggle(item,supports,setSupports)}/>{item}</label>)}</div>
        <div className="columns"><div><h3>Comunicação</h3><div className="optionStack">{communicationOptions.map((item)=><label key={item}><input type="checkbox" checked={communication.includes(item)} onChange={()=>toggle(item,communication,setCommunication)}/>{item}</label>)}</div></div>
        <div><h3>Autonomia</h3><div className="optionStack"><label><input type="radio" name="autonomy" checked={autonomy==="intensive"} onChange={()=>setAutonomy("intensive")}/> Apoio intenso</label><label><input type="radio" name="autonomy" checked={autonomy==="moderate"} onChange={()=>setAutonomy("moderate")}/> Apoio moderado</label><label><input type="radio" name="autonomy" checked={autonomy==="autonomous"} onChange={()=>setAutonomy("autonomous")}/> Maior autonomia</label></div></div></div>
        <h3>Formas de resposta</h3><div className="optionGrid compact">{responseOptions.map((item)=><label className={responses.includes(item)?"selected":""} key={item}><input type="checkbox" checked={responses.includes(item)} onChange={()=>toggle(item,responses,setResponses)}/>{item}</label>)}</div>
      </div>
      <button className="generateButton" type="button" onClick={generate} disabled={!canGenerate}><Sparkles/> Gerar adaptação</button>
      {message&&<p className="adaptMessage">{message}</p>}
    </section>

    {result&&<section id="resultado" className="adaptResult">
      <div className="resultHead"><div><small>PRÉVIA DO ESTUDANTE</small><h2>{result.title}</h2><p>{result.studentIntro}</p></div><button onClick={save} disabled={saving}><Save/> {saving?"Salvando...":"Salvar rascunho"}</button></div>
      <div className="studentMaterialPreview">{result.blocks.map((block)=><article key={block.index}><span>{block.index}</span><p>{block.text}</p></article>)}</div>
      <div className="guidanceGrid"><section><h3>Professor regente</h3><ul>{result.teacherGuidance.map((item)=><li key={item}>{item}</li>)}</ul></section><section><h3>AEE / apoio</h3><ul>{result.aeeGuidance.map((item)=><li key={item}>{item}</li>)}</ul></section></div>
      <section className="supportSummary"><h3>Apoios aplicados</h3><div>{result.supportsApplied.map((item)=><span key={item}>{item}</span>)}</div></section>
    </section>}
  </section></main>;
}
