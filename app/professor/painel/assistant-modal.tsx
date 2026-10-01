"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bot, Clipboard, ExternalLink, Sparkles, X } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { canonicalComponents, normalizeSchoolYear, sortSchoolYears } from "@/lib/curriculum-normalization";
import {
  buildAssistantSuggestion,
  type AccessibilityAssistantStrategy,
  type AssistantMode,
  type AssistantSuggestion,
  type CurriculumAssistantItem,
} from "@/lib/assistant-engine";
import styles from "./assistant-modal.module.css";

type Props = { onClose: () => void };

export default function AssistantModal({ onClose }: Props) {
  const [items, setItems] = useState<CurriculumAssistantItem[]>([]);
  const [strategies, setStrategies] = useState<AccessibilityAssistantStrategy[]>([]);
  const [mode, setMode] = useState<AssistantMode>("activity");
  const [component, setComponent] = useState<string>("Tecnologia e Inovação");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [itemId, setItemId] = useState("");
  const [profile, setProfile] = useState("none");
  const [suggestion, setSuggestion] = useState<AssistantSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void Promise.all([
      supabase.from("curriculum_items").select("id,component,school_year,term,theme,learning_objective,contents,skill_text,knowledge_object,project_delivery").order("component").order("school_year").order("term").order("theme"),
      supabase.from("accessibility_strategies").select("profile,access_barriers,presentation_supports,action_expression_supports,engagement_supports,validation_notes").order("profile"),
    ]).then(([curriculumResult, strategyResult]) => {
      setItems(((curriculumResult.data ?? []) as CurriculumAssistantItem[]).map((item) => ({ ...item, school_year: normalizeSchoolYear(item.school_year) })));
      setStrategies((strategyResult.data ?? []) as AccessibilityAssistantStrategy[]);
      setLoading(false);
    });
  }, []);

  const components = useMemo(() => canonicalComponents.filter((value) => items.some((item) => item.component === value)), [items]);
  const years = useMemo(() => Array.from(new Set(items.filter((item) => item.component === component).map((item) => item.school_year))).sort(sortSchoolYears), [items, component]);
  const terms = useMemo(() => Array.from(new Set(items.filter((item) => item.component === component && item.school_year === year).map((item) => item.term))).sort((a,b)=>a.localeCompare(b,"pt-BR")), [items, component, year]);
  const themes = useMemo(() => items.filter((item) => item.component === component && item.school_year === year && item.term === term), [items, component, year, term]);

  useEffect(() => {
    if (components.length && !components.includes(component as (typeof canonicalComponents)[number])) setComponent(components[0]);
  }, [components, component]);
  useEffect(() => {
    if (years.length && !years.includes(year)) setYear(years[0]);
  }, [years, year]);
  useEffect(() => {
    if (terms.length && !terms.includes(term)) setTerm(terms[0]);
  }, [terms, term]);
  useEffect(() => {
    if (themes.length && !themes.some((item) => item.id === itemId)) setItemId(themes[0].id);
  }, [themes, itemId]);
  useEffect(() => setSuggestion(null), [mode, component, year, term, itemId, profile]);

  function generate() {
    const item = items.find((row) => row.id === itemId);
    if (!item) return;
    const strategy = profile === "none" ? null : strategies.find((row) => row.profile === profile) ?? null;
    setSuggestion(buildAssistantSuggestion(mode, item, strategy));
  }

  async function copySuggestion() {
    if (!suggestion) return;
    const text = [
      suggestion.title,
      "",
      "Objetivo:",
      suggestion.objective,
      "",
      suggestion.summary,
      "",
      "Etapas:",
      ...suggestion.steps.map((value) => `- ${value}`),
      "",
      "Evidências / proposta:",
      ...suggestion.evidence.map((value) => `- ${value}`),
      ...(suggestion.accessibility.length ? ["", "Apoios de acessibilidade:", ...suggestion.accessibility.map((value) => `- ${value}`)] : []),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopyMessage("Sugestão copiada.");
    window.setTimeout(() => setCopyMessage(""), 1800);
  }

  return <div className={styles.backdrop} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="assistant-title">
      <header className={styles.header}>
        <div><span><Bot/></span><div><small>Assistente DUDA</small><h2 id="assistant-title">Sugestão pedagógica</h2></div></div>
        <button type="button" onClick={onClose} aria-label="Fechar assistente"><X/></button>
      </header>

      <div className={styles.notice}><Sparkles/> V1 integrada ao próprio DUDA: usa currículo e estratégias de acessibilidade já cadastradas. A decisão final é sempre do professor.</div>

      {loading ? <div className={styles.loading}>Carregando currículo e estratégias...</div> : <>
        <div className={styles.modeGrid}>
          <button className={mode==="activity"?styles.active:""} onClick={()=>setMode("activity")} type="button"><b>Sugerir atividade</b><small>Gera estrutura de aula e quatro evidências.</small></button>
          <button className={mode==="adaptation"?styles.active:""} onClick={()=>setMode("adaptation")} type="button"><b>Sugerir adaptação</b><small>Mantém o objetivo e reduz barreiras.</small></button>
          <button className={mode==="objective"?styles.active:""} onClick={()=>setMode("objective")} type="button"><b>Objetivo e evidências</b><small>Organiza objetivo, critérios e fechamento.</small></button>
        </div>

        <div className={styles.filters}>
          <label>Componente<select value={component} onChange={(e)=>setComponent(e.target.value)}>{components.map((value)=><option key={value}>{value}</option>)}</select></label>
          <label>Ano / série<select value={year} onChange={(e)=>setYear(e.target.value)}>{years.map((value)=><option key={value}>{value}</option>)}</select></label>
          <label>Bimestre<select value={term} onChange={(e)=>setTerm(e.target.value)}>{terms.map((value)=><option key={value}>{value}</option>)}</select></label>
          <label className={styles.theme}>Tema / objeto<select value={itemId} onChange={(e)=>setItemId(e.target.value)}>{themes.map((item)=><option key={item.id} value={item.id}>{item.theme ?? "Registro curricular"}</option>)}</select></label>
          <label className={styles.profile}>Acessibilidade<select value={profile} onChange={(e)=>setProfile(e.target.value)}><option value="none">Sem perfil específico</option>{strategies.map((strategy)=><option key={strategy.profile} value={strategy.profile}>{strategy.profile}</option>)}</select></label>
        </div>

        <button type="button" className={styles.generate} onClick={generate} disabled={!itemId}><Sparkles/> Gerar sugestão</button>

        {suggestion && <section className={styles.result}>
          <div className={styles.resultTop}><div><small>Resultado do Assistente DUDA</small><h3>{suggestion.title}</h3></div><span>Revisar antes de usar</span></div>
          <div className={styles.objective}><b>Objetivo</b><p>{suggestion.objective}</p></div>
          <p className={styles.summary}>{suggestion.summary}</p>

          <div className={styles.columns}>
            <div><h4>Etapas sugeridas</h4><ol>{suggestion.steps.map((value)=><li key={value}>{value}</li>)}</ol></div>
            <div><h4>Evidências / proposta</h4><ul>{suggestion.evidence.map((value)=><li key={value}>{value}</li>)}</ul></div>
          </div>

          {suggestion.accessibility.length>0 && <div className={styles.supports}><h4>Apoios sugeridos</h4><div>{suggestion.accessibility.map((value)=><span key={value}>{value}</span>)}</div></div>}

          <div className={styles.actions}>
            <button type="button" onClick={()=>void copySuggestion()}><Clipboard/> Copiar sugestão</button>
            <Link href="/professor/atividade/nova"><ExternalLink/> Abrir Criar atividade</Link>
            {copyMessage&&<small>{copyMessage}</small>}
          </div>
        </section>}
      </>}
    </section>
  </div>;
}
