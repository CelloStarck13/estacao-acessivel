"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, PenLine, Save, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { buildGeneratedActivity } from "@/lib/activity-generator";
import "./atividade.css";

type CurriculumItem = {
  id: string;
  component: string;
  school_year: string;
  term: string;
  theme: string;
  learning_objective: string | null;
  source_status: "official";
  material_key: string;
  source_name: string;
  teacher_materials: Array<{ label: string; url: string }>;
  student_materials: Array<{ label: string; url: string }>;
  domain: string;
  pedagogical_focus: string;
  learning_objectives: string[];
  core_concepts: string[];
  authentic_contexts: string[];
  activity_patterns: string[];
  assessment_evidence: string[];
  misconception_alerts: string[];
  fidelity_status: "extracted" | "reviewed";
};

type CreationMode = "automatic" | "manual";

const profileOptions = [
  "TEA",
  "Síndrome de Down",
  "Deficiência intelectual",
  "Cegueira",
  "Baixa visão",
  "Surdez",
  "Deficiência auditiva",
  "Surdocegueira",
  "Deficiência física",
  "Deficiência múltipla",
  "Altas habilidades / superdotação",
  "TDAH / atenção e autorregulação",
  "Transtorno específico de aprendizagem",
  "Outro / não informado",
];

const supportOptions = [
  "Linguagem objetiva",
  "Uma etapa por vez",
  "Apoio visual",
  "Rotina previsível",
  "Leitura em voz alta",
  "Libras",
  "Descrição textual de imagens",
  "Alto contraste / ampliação",
  "Redução de carga cognitiva",
  "Exemplos concretos",
  "Tempo ampliado",
  "Menos estímulos visuais",
  "Pistas graduais",
  "Repetição / retomada",
  "Tecnologia assistiva",
  "Mediação do professor / AEE",
  "Comunicação alternativa / aumentativa",
];

const responseOptions = ["Seleção", "Texto"];

const manualYears: Record<string, string[]> = {
  "Tecnologia e Inovação": ["6º ano", "7º ano", "8º ano", "9º ano"],
  "Programação": ["2ª série EM", "3ª série EM"],
  "Robótica": ["6º ano", "7º ano", "8º ano", "9º ano", "1ª série EM", "2ª série EM", "3ª série EM"],
};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export default function NovaAtividadePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<CreationMode>("automatic");
  const [catalog, setCatalog] = useState<CurriculumItem[]>([]);

  const [component, setComponent] = useState("Tecnologia e Inovação");
  const [schoolYear, setSchoolYear] = useState("");
  const [term, setTerm] = useState("");
  const [theme, setTheme] = useState("");

  const [manualComponent, setManualComponent] = useState("Tecnologia e Inovação");
  const [manualSchoolYear, setManualSchoolYear] = useState("6º ano");

  const [learnerProfiles, setLearnerProfiles] = useState<string[]>([]);
  const [supportNeeds, setSupportNeeds] = useState<string[]>([]);
  const [autonomyLevel, setAutonomyLevel] = useState("moderate");
  const [responseModes, setResponseModes] = useState<string[]>(["Seleção"]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/professor");
        return;
      }
      setAuthorized(true);
      const { data: items } = await supabase
        .from("pedagogical_units")
        .select("material_key,component,school_year,term,unit_title,domain,pedagogical_focus,learning_objectives,core_concepts,authentic_contexts,activity_patterns,assessment_evidence,misconception_alerts,source_documents,fidelity_status,ready_for_generation")
        .eq("ready_for_generation", true)
        .order("school_year")
        .order("term")
        .order("unit_title");
      setCatalog((items ?? []).map((item) => {
        const documents = (item.source_documents ?? []) as Array<{ label: string; url: string }>;
        return ({
        id: item.material_key,
        material_key: item.material_key,
        component: item.component,
        school_year: item.school_year,
        term: item.term,
        theme: item.unit_title,
        learning_objective: item.learning_objectives?.[0] ?? null,
        source_status: "official",
        source_name: "Materiais oficiais SEDUC 2026 — conteúdo extraído",
        teacher_materials: documents.filter((document) => /professor|guia|gabarito/i.test(document.label)),
        student_materials: documents.filter((document) => !/professor|guia|gabarito/i.test(document.label)),
        domain: item.domain,
        pedagogical_focus: item.pedagogical_focus,
        learning_objectives: item.learning_objectives ?? [],
        core_concepts: item.core_concepts ?? [],
        authentic_contexts: item.authentic_contexts ?? [],
        activity_patterns: item.activity_patterns ?? [],
        assessment_evidence: item.assessment_evidence ?? [],
        misconception_alerts: item.misconception_alerts ?? [],
        fidelity_status: item.fidelity_status,
      });}) as CurriculumItem[]);
    });
  }, [router]);

  const components = useMemo(() => unique(catalog.map((item) => item.component)), [catalog]);
  const years = useMemo(() => unique(catalog.filter((item) => item.component === component).map((item) => item.school_year)), [catalog, component]);
  const terms = useMemo(() => unique(catalog.filter((item) => item.component === component && item.school_year === schoolYear).map((item) => item.term)), [catalog, component, schoolYear]);
  const themes = useMemo(() => catalog.filter((item) => item.component === component && item.school_year === schoolYear && item.term === term), [catalog, component, schoolYear, term]);

  useEffect(() => {
    if (components.length && !components.includes(component)) setComponent(components[0]);
  }, [components, component]);

  useEffect(() => {
    if (years.length && !years.includes(schoolYear)) setSchoolYear(years[0]);
  }, [years, schoolYear]);

  useEffect(() => {
    if (terms.length && !terms.includes(term)) setTerm(terms[0]);
  }, [terms, term]);

  useEffect(() => {
    if (themes.length && !themes.some((item) => item.theme === theme)) setTheme(themes[0].theme);
  }, [themes, theme]);

  useEffect(() => {
    if (autonomyLevel === "intensive" && responseModes.includes("Texto")) setResponseModes((current) => current.filter((mode) => mode !== "Texto"));
  }, [autonomyLevel, responseModes]);

  const selectedCurriculum = themes.find((item) => item.theme === theme) ?? null;

  function toggle(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setMessage(mode === "automatic" ? "Gerando atividade personalizada..." : "Salvando rascunho...");

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setMessage("Sua sessão expirou. Entre novamente para continuar.");
        router.replace("/professor");
        return;
      }

      let payload: Record<string, unknown>;
      let generated = null;

      if (mode === "automatic") {
        if (!selectedCurriculum) {
          setMessage("Selecione componente, ano/série, bimestre e tema para continuar.");
          return;
        }
        if (!responseModes.length) {
          setMessage("Selecione pelo menos uma forma de resposta funcional.");
          return;
        }

        generated = buildGeneratedActivity({
          component,
          schoolYear,
          term,
          theme,
          curriculumObjective: selectedCurriculum.learning_objective,
          learnerProfiles,
          supportNeeds,
          autonomyLevel,
          responseModes,
          sourceUnit: {
            materialKey: selectedCurriculum.material_key,
            sourceName: selectedCurriculum.source_name,
            teacherMaterials: selectedCurriculum.teacher_materials,
            studentMaterials: selectedCurriculum.student_materials,
            domain: selectedCurriculum.domain,
            pedagogicalFocus: selectedCurriculum.pedagogical_focus,
            learningObjectives: selectedCurriculum.learning_objectives,
            coreConcepts: selectedCurriculum.core_concepts,
            authenticContexts: selectedCurriculum.authentic_contexts,
            activityPatterns: selectedCurriculum.activity_patterns,
            assessmentEvidence: selectedCurriculum.assessment_evidence,
            misconceptionAlerts: selectedCurriculum.misconception_alerts,
            fidelityStatus: selectedCurriculum.fidelity_status,
          },
        });

        payload = {
          owner_id: user.id,
          creation_mode: "automatic",
          title: generated.title,
          description: generated.description,
          component,
          school_year: schoolYear,
          term,
          theme,
          learning_objective: generated.learningObjective,
          delivery_mode: String(form.get("delivery_mode") ?? "digital"),
          learner_profiles: learnerProfiles,
          support_needs: supportNeeds,
          autonomy_level: autonomyLevel,
          response_modes: responseModes,
          generated_content: generated,
          status: "draft",
        };
      } else {
        payload = {
          owner_id: user.id,
          creation_mode: "manual",
          title: String(form.get("title") ?? "").trim(),
          description: String(form.get("description") ?? "").trim() || null,
          component: manualComponent,
          school_year: manualSchoolYear,
          term: String(form.get("manual_term") ?? "").trim() || null,
          theme: String(form.get("manual_theme") ?? "").trim() || null,
          learning_objective: String(form.get("learning_objective") ?? "").trim() || null,
          delivery_mode: String(form.get("delivery_mode") ?? "digital"),
          learner_profiles: learnerProfiles,
          support_needs: supportNeeds,
          autonomy_level: autonomyLevel,
          response_modes: responseModes,
          status: "draft",
        };
      }

      const { data: activity, error } = await supabase.from("activities").insert(payload).select("id").single();

      if (error || !activity) {
        setMessage("Não foi possível criar a atividade. Tente novamente.");
        return;
      }

      if (generated) {
        const questionRows = generated.questions.map((question) => ({
          activity_id: activity.id,
          position: question.position,
          prompt: question.prompt,
          question_type: question.question_type,
          options: question.options ?? [],
          correct_answer: question.correct_answer ?? null,
          accessibility_support: question.accessibility_support ?? null,
          points: question.points ?? 1,
          media_url: question.media_url ?? null,
          media_alt: question.media_alt ?? null,
          media_caption: question.media_caption ?? null,
        }));
        const { error: questionError } = await supabase.from("questions").insert(questionRows);
        if (questionError) {
          setMessage("A atividade foi criada, mas houve erro ao montar as questões.");
          return;
        }
      }

      router.push(`/professor/atividade/${activity.id}`);
    } catch {
      setMessage("Ocorreu um erro ao criar a atividade.");
    } finally {
      setSaving(false);
    }
  }

  if (!authorized) {
    return <main className="authPage"><section className="authPanel"><p>Verificando acesso...</p></section></main>;
  }

  return (
    <main className="activityCreatePage">
      <section className="activityCreateShell wide">
        <header className="activityCreateHeader">
          <Link href="/professor/painel"><ArrowLeft size={18} /> Voltar ao painel</Link>
          <span>DUDA — Estação Acessível</span>
        </header>

        <section className="activityCreateCard">
          <div className="activityIntro">
            <div>
              <h1>Criar atividade</h1>
              <p>O DUDA pode montar a atividade para você ou permitir preenchimento manual. O professor revisa antes de publicar.</p>
            </div>
            <div className="modeSwitcher" role="group" aria-label="Modo de criação">
              <button type="button" className={mode === "automatic" ? "active" : ""} onClick={() => setMode("automatic")}><WandSparkles size={18} /> Gerar automaticamente</button>
              <button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}><PenLine size={18} /> Preencher manualmente</button>
            </div>
          </div>

          <form className="activityForm" onSubmit={saveActivity}>
            {mode === "automatic" ? (
              <section className="formSection">
                <div className="sectionTitle"><Sparkles size={19} /><div><h2>1. Escolha o ponto curricular</h2><p>Você seleciona; o DUDA monta título, objetivo, proposta, questões, apoios e avaliação.</p></div></div>
                <div className="activityFormGrid four">
                  <label>Componente<select value={component} onChange={(e) => setComponent(e.target.value)}>{components.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Ano / série<select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)}>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Bimestre<select value={term} onChange={(e) => setTerm(e.target.value)}>{terms.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Tema / objeto<select value={theme} onChange={(e) => setTheme(e.target.value)}>{themes.map((item) => <option key={item.id}>{item.theme}</option>)}</select></label>
                </div>
                {selectedCurriculum && <div className="curriculumPreview"><b>Unidade oficial com conteúdo indexado</b><p>{selectedCurriculum.theme}</p><p>{selectedCurriculum.learning_objectives[0]}</p><small className="official">{selectedCurriculum.source_name} · conceitos: {selectedCurriculum.core_concepts.slice(0, 5).join(", ")} · {selectedCurriculum.teacher_materials.length + selectedCurriculum.student_materials.length} documento(s)</small></div>}
              </section>
            ) : (
              <section className="formSection">
                <div className="sectionTitle"><PenLine size={19} /><div><h2>1. Preenchimento manual</h2><p>Use este modo apenas quando quiser construir uma proposta específica fora do fluxo automático.</p></div></div>
                <label>Título da atividade<input name="title" required={mode === "manual"} maxLength={160} placeholder="Ex.: Missão do Robô — Sequências e Algoritmos" /></label>
                <div className="activityFormGrid">
                  <label>Componente<select value={manualComponent} onChange={(e) => { const next = e.target.value; setManualComponent(next); setManualSchoolYear(manualYears[next][0]); }}>{Object.keys(manualYears).map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Ano / série<select value={manualSchoolYear} onChange={(e) => setManualSchoolYear(e.target.value)}>{manualYears[manualComponent].map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Bimestre<select name="manual_term" defaultValue="1º bimestre"><option>1º bimestre</option><option>2º bimestre</option><option>3º bimestre</option><option>4º bimestre</option></select></label>
                  <label>Tema<input name="manual_theme" placeholder="Tema ou objeto de conhecimento" /></label>
                </div>
                <label>Objetivo de aprendizagem<textarea name="learning_objective" placeholder="Descreva o que o estudante deverá compreender ou realizar." /></label>
                <label>Descrição<textarea name="description" placeholder="Resumo da proposta, contexto ou orientação para o professor." /></label>
              </section>
            )}

            <section className="formSection personalizationSection">
              <div className="sectionTitle"><ShieldCheck size={19} /><div><h2>2. Personalizar para este estudante</h2><p>O diagnóstico é opcional. O DUDA usa o perfil apenas para sugerir apoios e nunca o exibe na atividade do estudante.</p></div></div>

              <div className="optionBlock">
                <h3>Perfil / condição informada <span>opcional e restrito ao professor</span></h3>
                <div className="checkGrid">{profileOptions.map((value) => <label className="checkCard" key={value}><input type="checkbox" checked={learnerProfiles.includes(value)} onChange={() => toggle(value, learnerProfiles, setLearnerProfiles)} /><span>{value}</span></label>)}</div>
              </div>

              <div className="optionBlock">
                <h3>Quais apoios este estudante necessita?</h3>
                <div className="checkGrid">{supportOptions.map((value) => <label className="checkCard" key={value}><input type="checkbox" checked={supportNeeds.includes(value)} onChange={() => toggle(value, supportNeeds, setSupportNeeds)} /><span>{value}</span></label>)}</div>
              </div>

              <div className="activityFormGrid">
                <div className="optionBlock compact">
                  <h3>Nível atual de autonomia</h3>
                  <label className="radioCard"><input type="radio" name="autonomy" checked={autonomyLevel === "intensive"} onChange={() => setAutonomyLevel("intensive")} /> Apoio intenso</label>
                  <label className="radioCard"><input type="radio" name="autonomy" checked={autonomyLevel === "moderate"} onChange={() => setAutonomyLevel("moderate")} /> Apoio moderado</label>
                  <label className="radioCard"><input type="radio" name="autonomy" checked={autonomyLevel === "autonomous"} onChange={() => setAutonomyLevel("autonomous")} /> Maior autonomia</label>
                </div>
                <div className="optionBlock compact">
                  <h3>Formas de resposta</h3>
                  <div className="checkGrid small">{responseOptions.map((value) => <label className="checkCard" key={value}><input type="checkbox" checked={responseModes.includes(value)} disabled={value === "Seleção"} onChange={() => toggle(value, responseModes, setResponseModes)} /><span>{value}{value === "Seleção" ? " (obrigatória)" : ""}</span></label>)}</div>
                  <small>Seleção é a base funcional das atividades. Texto é opcional e removido automaticamente no apoio intenso. Áudio, desenho, imagem, código e arrastar serão liberados somente quando estiverem funcionais.</small>
                </div>
              </div>
            </section>

            <section className="formSection useSection">
              <h2>3. Forma de uso</h2>
              <label>Entrega<select name="delivery_mode" defaultValue="digital"><option value="digital">Digital</option><option value="print">Para impressão</option><option value="both">Digital e impressão</option></select></label>
            </section>

            {message && <div className="activitySaveMessage" role="status">{message}</div>}

            <div className="activityFormActions primaryActions">
              <button type="submit" disabled={saving}>{mode === "automatic" ? <><WandSparkles size={18} /> {saving ? "Gerando..." : "Gerar atividade personalizada"}</> : <><Save size={18} /> {saving ? "Salvando..." : "Salvar rascunho manual"}</>}</button>
              <Link href="/professor/painel">Cancelar</Link>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
