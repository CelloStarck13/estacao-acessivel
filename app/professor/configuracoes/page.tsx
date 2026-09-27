"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save, Settings, ShieldCheck, Type } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./configuracoes.css";

type Profile = {
  id:string;
  email:string;
  display_name:string|null;
  school_name:string|null;
  role:string;
};

const STORAGE_KEY="duda-interface-preferences";

type Preferences={largeText:boolean;highContrast:boolean};

function loadPreferences():Preferences{
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return{largeText:false,highContrast:false};
    return{largeText:false,highContrast:false,...JSON.parse(raw)};
  }catch{return{largeText:false,highContrast:false};}
}

function applyPreferences(p:Preferences){
  document.documentElement.classList.toggle("duda-large-text",p.largeText);
  document.documentElement.classList.toggle("duda-high-contrast",p.highContrast);
}

export default function ConfiguracoesPage(){
  const router=useRouter();
  const[authorized,setAuthorized]=useState(false);
  const[profile,setProfile]=useState<Profile|null>(null);
  const[displayName,setDisplayName]=useState("");
  const[schoolName,setSchoolName]=useState("");
  const[prefs,setPrefs]=useState<Preferences>({largeText:false,highContrast:false});
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");

  useEffect(()=>{
    const supabase=createBrowserSupabaseClient();
    const localPrefs=loadPreferences();setPrefs(localPrefs);applyPreferences(localPrefs);
    void supabase.auth.getSession().then(async({data})=>{
      if(!data.session){router.replace("/professor");return;}
      const{data:row,error}=await supabase.from("profiles").select("id,email,display_name,school_name,role").eq("id",data.session.user.id).single();
      if(error||!row){setMessage("Não foi possível carregar seu perfil.");setAuthorized(true);return;}
      const p=row as Profile;setProfile(p);setDisplayName(p.display_name??"");setSchoolName(p.school_name??"");setAuthorized(true);
    });
  },[router]);

  async function saveProfile(event:FormEvent){
    event.preventDefault();
    if(!profile)return;
    setSaving(true);setMessage("");
    const supabase=createBrowserSupabaseClient();
    const{error}=await supabase.from("profiles").update({
      display_name:displayName.trim()||null,
      school_name:schoolName.trim()||null,
    }).eq("id",profile.id);
    setSaving(false);
    setMessage(error?"Não foi possível salvar as alterações.":"Configurações salvas.");
  }

  function updatePrefs(next:Preferences){
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    applyPreferences(next);
    setMessage("Preferências da interface atualizadas neste navegador.");
  }

  if(!authorized)return<main className="settingsPage"><section className="settingsShell"><p>Verificando acesso...</p></section></main>;

  return<main className="settingsPage"><section className="settingsShell">
    <header className="settingsHeader"><Link href="/professor/painel"><ArrowLeft size={18}/> Voltar ao painel</Link><div><Settings size={20}/><span>Configurações</span></div></header>

    <section className="settingsHero"><small>DUDA — Estação Acessível</small><h1>Configurações</h1><p>Ajuste os dados básicos do seu perfil e algumas preferências reais da interface.</p></section>

    <div className="settingsGrid">
      <form className="settingsCard" onSubmit={saveProfile}>
        <div className="cardTitle"><ShieldCheck/><div><h2>Perfil</h2><p>Dados usados para identificar você dentro do DUDA.</p></div></div>

        <label>Nome de exibição
          <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Como seu nome deve aparecer no painel"/>
        </label>

        <label>Escola
          <input value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Nome da escola"/>
        </label>

        <label>E-mail
          <input value={profile?.email??""} readOnly className="readonly"/>
          <small>O e-mail vem da sua conta e não é alterado nesta tela.</small>
        </label>

        <label>Perfil de acesso
          <input value={profile?.role==="professor"?"Professor":profile?.role??""} readOnly className="readonly"/>
        </label>

        <button className="saveButton" type="submit" disabled={saving}><Save size={17}/>{saving?"Salvando...":"Salvar perfil"}</button>
      </form>

      <section className="settingsCard">
        <div className="cardTitle"><Eye/><div><h2>Preferências da interface</h2><p>Estas opções afetam a visualização do DUDA neste navegador.</p></div></div>

        <label className="toggleRow">
          <span><Type/><b>Texto ampliado</b><small>Aumenta o tamanho-base dos textos da interface.</small></span>
          <input type="checkbox" checked={prefs.largeText} onChange={e=>updatePrefs({...prefs,largeText:e.target.checked})}/>
        </label>

        <label className="toggleRow">
          <span><Eye/><b>Alto contraste</b><small>Reforça contraste de fundo, texto e elementos principais.</small></span>
          <input type="checkbox" checked={prefs.highContrast} onChange={e=>updatePrefs({...prefs,highContrast:e.target.checked})}/>
        </label>

        <div className="localNote"><strong>Importante:</strong> essas duas preferências ficam salvas neste navegador. Elas não alteram dados pedagógicos nem o perfil do estudante.</div>
      </section>
    </div>

    {message&&<div className="settingsMessage">{message}</div>}
  </section></main>;
}
