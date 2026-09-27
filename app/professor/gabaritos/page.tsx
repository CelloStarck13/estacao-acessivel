"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, CheckSquare, FileText, Printer, Search } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./gabaritos.css";

type Activity = {
  id: string;
  title: string;
  component: string | null;
  school_year: string | null;
  term: string | null;
  status: string;
  created_at: string;
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
  const [statusFilter, setStatusFilter] = useState("all");
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
        .select("id,title,component,school_year,term,status,created_at")
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesText = !term || `${item.title} ${item.component ?? ""} ${item.school_year ?? ""} ${item.term ?? ""}`.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [items, search, statusFilter]);

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

      <section className="keyMetrics">
        <article><BookOpen/><div><small>Atividades</small><strong>{items.length}</strong></div></article>
        <article><CheckCircle2/><div><small>Questões objetivas</small><strong>{objectiveCount}</strong></div></article>
        <article><FileText/><div><small>Questões abertas</small><strong>{openCount}</strong></div></article>
      </section>

      <section className="keyTools">
        <label><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, componente ou ano/série"/></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todas</option>
          <option value="published">Publicadas</option>
          <option value="draft">Rascunhos</option>
          <option value="review">Em revisão</option>
        </select>
      </section>

      {error && <div className="keyError" role="alert">{error}</div>}

      {loading ? <div className="keyEmpty">Carregando gabaritos...</div> : filtered.length === 0 ? <div className="keyEmpty">Nenhum gabarito encontrado.</div> : <section className="keyList">
        {filtered.map((item) => <article className="keyCard" key={item.id}>
          <div className="keyCardTop">
            <div>
              <span className={item.status === "published" ? "published" : "draft"}>{item.status === "published" ? "Publicada" : item.status === "review" ? "Em revisão" : "Rascunho"}</span>
              <h2>{item.title}</h2>
              <small>{[item.school_year, item.component, item.term].filter(Boolean).join(" • ") || "Atividade personalizada"}</small>
            </div>
            <Link href={`/professor/atividade/${item.id}`}>Abrir atividade</Link>
          </div>

          {item.questions.length === 0 ? <p className="noQuestions">Esta atividade ainda não possui questões.</p> : <div className="keyQuestions">
            {item.questions.map((question) => <section key={question.id}>
              <div className="questionTitle"><b>{question.position}</b><strong>{question.prompt}</strong><span>{question.points} ponto(s)</span></div>
              {question.options?.length > 0 && <ul>{question.options.map((option) => <li key={option} className={String(question.correct_answer) === option ? "correctOption" : ""}>{option}{String(question.correct_answer) === option ? " ✓" : ""}</li>)}</ul>}
              <div className="answerLine"><span>Gabarito</span><strong>{formatAnswer(question)}</strong></div>
            </section>)}
          </div>}
        </article>)}
      </section>}
    </section>
  </main>;
}
