"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, CheckSquare, FileText, Printer, Search } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { canonicalComponents, normalizeSchoolYear, sortSchoolYears } from "@/lib/curriculum-normalization";
import "./gabaritos.css";

type Activity = {
  id: string;
  title: string;
  component: string | null;
  school_year: string | null;
  term: string | null;
  status: string;
  created_at: string;
  learner_profiles: string[];
};

type Question = {
  id: string;
  activity_id: string;
  position: number;
  prompt: string;
  question_type: "instruction" | "open_text" | "multiple_choice" | "true_false";
  options: string[];
  correct_answer: string | boolean | null;
  points: number;
};

type AnswerKey = Activity & { questions: Question[] };

function formatAnswer(question: Question) {
  if (question.question_type === "open_text") return "Resposta aberta — correção manual";
  if (question.question_type === "instruction") return "Somente instrução";
  if (typeof question.correct_answer === "boolean") return question.correct_answer ? "Verdadeiro" : "Falso";
  return question.correct_answer || "Sem resposta definida";
}

export default function GabaritosPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<AnswerKey[]>([]);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grouped" | "all">("grouped");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/professor");
        return;
      }

      const userId = data.session.user.id;
      const { data: activities, error: activityError } = await supabase
        .from("activities")
        .select("id,title,component,school_year,term,status,created_at,learner_profiles")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (activityError) {
        setError("Não foi possível carregar os gabaritos.");
        setLoading(false);
        setAuthorized(true);
        return;
      }

      const activityIds = (activities ?? []).map((activity) => activity.id);
      const { data: questions, error: questionError } = activityIds.length
        ? await supabase
            .from("questions")
            .select("id,activity_id,position,prompt,question_type,options,correct_answer,points")
            .in("activity_id", activityIds)
            .order("position")
        : { data: [], error: null };

      if (questionError) setError("As atividades foram carregadas, mas houve erro ao buscar as questões.");

      const grouped = new Map<string, Question[]>();
      for (const question of questions ?? []) {
        const current = grouped.get(question.activity_id) ?? [];
        current.push(question as Question);
        grouped.set(question.activity_id, current);
      }

      setItems((activities ?? []).map((activity) => ({
        ...(activity as Activity),
        questions: grouped.get(activity.id) ?? [],
      })));
      setAuthorized(true);
      setLoading(false);
    });
  }, [router]);

  const years = useMemo(() => Array.from(new Set(items.map((item) => normalizeSchoolYear(item.school_year)).filter(Boolean))).sort(sortSchoolYears), [items]);
  const components = canonicalComponents;
  const profiles = useMemo(() => Array.from(new Set(items.flatMap((item) => item.learner_profiles ?? []).filter(Boolean))).sort((a,b) => a.localeCompare(b, "pt-BR")), [items]);
  const terms = useMemo(() => Array.from(new Set(items.map((item) => item.term).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b, "pt-BR")), [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = `${item.title} ${item.component ?? ""} ${item.school_year ?? ""} ${item.term ?? ""} ${(item.learner_profiles ?? []).join(" ")}`.toLowerCase();
      const matchesText = !term || haystack.includes(term);
      const matchesYear = yearFilter === "all" || normalizeSchoolYear(item.school_year) === yearFilter;
      const matchesComponent = componentFilter === "all" || item.component === componentFilter;
      const matchesProfile = profileFilter === "all" || (item.learner_profiles ?? []).includes(profileFilter);
      const matchesTerm = termFilter === "all" || item.term === termFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesText && matchesYear && matchesComponent && matchesProfile && matchesTerm && matchesStatus;
    });
  }, [items, search, yearFilter, componentFilter, profileFilter, termFilter, statusFilter]);

  const groupedByYear = useMemo(() => {
    const groups = new Map<string, AnswerKey[]>();
    for (const item of filtered) {
      const key = normalizeSchoolYear(item.school_year);
      const current = groups.get(key) ?? [];
      current.push(item);
      groups.set(key, current);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const objectiveCount = items.reduce((total, item) => total + item.questions.filter((question) => ["multiple_choice", "true_false"].includes(question.question_type)).length, 0);
  const openCount = items.reduce((total, item) => total + item.questions.filter((question) => question.question_type === "open_text").length, 0);

  if (!authorized) return <main className="keyPage"><section className="keyShell"><p>Verificando acesso...</p></section></main>;

  return <main className="keyPage">
    <section className="keyShell">
      <header className="keyHeader">
        <Link href="/professor/painel"><ArrowLeft size={18}/> Voltar ao painel</Link>
        <div><CheckSquare size={20}/><span>Gabaritos</span></div>
      </header>

      <section className="keyHero">
        <div>
          <small>DUDA — Estação Acessível</small>
          <h1>Gabaritos das atividades</h1>
          <p>Consulte respostas corretas, pontuação e questões abertas sem alterar nenhuma atividade.</p>
        </div>
        <button type="button" onClick={() => window.print()}><Printer size={18}/> Imprimir</button>
      </section>

      <div className="keySummary">
        <strong>{items.length} atividades</strong>
        <span>{objectiveCount} questões objetivas</span>
        <span>{openCount} questões abertas</span>
      </div>

      <section className="keyTools">
        <label className="keySearch"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar atividade, tema, componente ou perfil"/></label>
        <select aria-label="Filtrar por ano ou série" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
          <option value="all">Ano/série: todos</option>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filtrar por componente" value={componentFilter} onChange={(event) => setComponentFilter(event.target.value)}>
          <option value="all">Componente: todos</option>
          {components.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filtrar por perfil ou condição" value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)}>
          <option value="all">Acessibilidade: todos</option>
          {profiles.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filtrar por bimestre" value={termFilter} onChange={(event) => setTermFilter(event.target.value)}>
          <option value="all">Bimestre: todos</option>
          {terms.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filtrar por status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Status: todos</option>
          <option value="published">Publicadas</option>
          <option value="draft">Rascunhos</option>
          <option value="review">Em revisão</option>
        </select>
        <select aria-label="Modo de visualização" value={viewMode} onChange={(event) => setViewMode(event.target.value as "grouped" | "all")}>
          <option value="grouped">Agrupar por ano/série</option>
          <option value="all">Mostrar todas</option>
        </select>
      </section>

      <div className="filterResultLine">
        <strong>{filtered.length} atividade(s) encontrada(s)</strong>
        {(search || yearFilter !== "all" || componentFilter !== "all" || profileFilter !== "all" || termFilter !== "all" || statusFilter !== "all") && <button type="button" onClick={() => { setSearch(""); setYearFilter("all"); setComponentFilter("all"); setProfileFilter("all"); setTermFilter("all"); setStatusFilter("all"); }}>Limpar filtros</button>}
      </div>

      {(yearFilter !== "all" || componentFilter !== "all" || profileFilter !== "all" || termFilter !== "all" || statusFilter !== "all") && <div className="activeFilters" aria-label="Filtros ativos">
        {yearFilter !== "all" && <span>Ano/série: {yearFilter}</span>}
        {componentFilter !== "all" && <span>Componente: {componentFilter}</span>}
        {profileFilter !== "all" && <span>Acessibilidade: {profileFilter}</span>}
        {termFilter !== "all" && <span>Bimestre: {termFilter}</span>}
        {statusFilter !== "all" && <span>Status: {statusFilter === "published" ? "Publicadas" : statusFilter === "draft" ? "Rascunhos" : "Em revisão"}</span>}
      </div>}

      {error && <div className="keyError" role="alert">{error}</div>}

      {loading ? <div className="keyEmpty">Carregando gabaritos...</div> : filtered.length === 0 ? <div className="keyEmpty">Nenhum gabarito encontrado.</div> : viewMode === "all" ? <section className="keyList">
        {filtered.map((item: AnswerKey) => <article className="keyCard" key={item.id}>
          <div className="keyCardTop">
            <div>
              <span className={item.status === "published" ? "published" : "draft"}>{item.status === "published" ? "Publicada" : item.status === "review" ? "Em revisão" : "Rascunho"}</span>
              <h2>{item.title}</h2>
              <small>{[normalizeSchoolYear(item.school_year), item.component, item.term].filter(Boolean).join(" • ") || "Atividade personalizada"}</small>
              {(item.learner_profiles ?? []).length > 0 && <div className="profileTags">{item.learner_profiles.slice(0, 4).map((profile) => <span key={profile}>{profile}</span>)}</div>}
            </div>
            <Link href={`/professor/atividade/${item.id}`}>Abrir atividade</Link>
          </div>

          {item.questions.length === 0 ? <p className="noQuestions">Esta atividade ainda não possui questões.</p> : <details className="keyDetails">
            <summary>Ver gabarito • {item.questions.length} questão(ões)</summary>
            <div className="keyQuestions">
              {item.questions.map((question) => <section key={question.id}>
                <div className="questionTitle"><b>{question.position}</b><strong>{question.prompt}</strong><span>{question.points} ponto(s)</span></div>
                {question.options?.length > 0 && <ul>{question.options.map((option) => <li key={option} className={String(question.correct_answer) === option ? "correctOption" : ""}>{option}{String(question.correct_answer) === option ? " ✓" : ""}</li>)}</ul>}
                <div className="answerLine"><span>Gabarito</span><strong>{formatAnswer(question)}</strong></div>
              </section>)}
            </div>
          </details>}
        </article>)}
      </section> : <section className="yearGroups">
        {groupedByYear.map(([year, activities]) => <details className="yearGroup" key={year}>
          <summary><span><strong>{year}</strong><small>{activities.length} atividade(s)</small></span><b>Abrir grupo</b></summary>
          <div className="keyList">{activities.map((item: AnswerKey) => <article className="keyCard" key={item.id}>
          <div className="keyCardTop">
            <div>
              <span className={item.status === "published" ? "published" : "draft"}>{item.status === "published" ? "Publicada" : item.status === "review" ? "Em revisão" : "Rascunho"}</span>
              <h2>{item.title}</h2>
              <small>{[item.school_year, item.component, item.term].filter(Boolean).join(" • ") || "Atividade personalizada"}</small>
              {(item.learner_profiles ?? []).length > 0 && <div className="profileTags">{item.learner_profiles.slice(0, 4).map((profile) => <span key={profile}>{profile}</span>)}</div>}
            </div>
            <Link href={`/professor/atividade/${item.id}`}>Abrir atividade</Link>
          </div>

          {item.questions.length === 0 ? <p className="noQuestions">Esta atividade ainda não possui questões.</p> : <details className="keyDetails">
            <summary>Ver gabarito • {item.questions.length} questão(ões)</summary>
            <div className="keyQuestions">
              {item.questions.map((question) => <section key={question.id}>
                <div className="questionTitle"><b>{question.position}</b><strong>{question.prompt}</strong><span>{question.points} ponto(s)</span></div>
                {question.options?.length > 0 && <ul>{question.options.map((option) => <li key={option} className={String(question.correct_answer) === option ? "correctOption" : ""}>{option}{String(question.correct_answer) === option ? " ✓" : ""}</li>)}</ul>}
                <div className="answerLine"><span>Gabarito</span><strong>{formatAnswer(question)}</strong></div>
              </section>)}
            </div>
          </details>}
        </article>)}</div>
        </details>)}
      </section>}
    </section>
  </main>;
}
