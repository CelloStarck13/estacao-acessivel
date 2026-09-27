"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./result.css";

type FeedbackAnswer = {
  position: number;
  prompt: string;
  question_type: "open_text" | "multiple_choice" | "true_false";
  answer: unknown;
  is_correct: boolean | null;
  points_awarded: number | null;
  max_points: number;
  review_note: string | null;
  reviewed_at: string | null;
};

type FeedbackResult = {
  activity_title: string;
  component: string | null;
  school_year: string | null;
  participant_alias: string | null;
  score: number | null;
  max_score: number | null;
  completed_at: string;
  review_complete: boolean;
  answers: FeedbackAnswer[];
};

function displayAnswer(value: unknown) {
  if (value === null || value === undefined || value === "") return "Sem resposta";
  if (typeof value === "boolean") return value ? "Verdadeiro" : "Falso";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export default function StudentFeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get("codigo") ?? "";
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code || !token) {
      setError("Informe o código da atividade e o protocolo da devolutiva.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    void supabase.rpc("get_submission_feedback", {
      p_access_code: code,
      p_feedback_token: decodeURIComponent(token),
    }).then(({ data, error: rpcError }) => {
      if (rpcError || !data) setError("Não foi possível localizar esta devolutiva. Confira o código e o protocolo.");
      else setResult(data as FeedbackResult);
      setLoading(false);
    });
  }, [code, token]);

  if (loading) return <main className="resultPage"><section className="resultShell"><p>Carregando devolutiva...</p></section></main>;
  if (error || !result) return <main className="resultPage"><section className="resultShell resultError"><h1>Devolutiva não encontrada</h1><p>{error}</p><Link href="/estudante"><ArrowLeft size={18}/> Voltar</Link></section></main>;

  return <main className="resultPage"><section className="resultShell">
    <header className="resultTop"><Link href="/estudante"><ArrowLeft size={18}/> Voltar</Link><span>{result.review_complete ? "Correção concluída" : "Correção em andamento"}</span></header>

    <section className="resultHero">
      <small>{[result.component, result.school_year].filter(Boolean).join(" • ")}</small>
      <h1>{result.activity_title}</h1>
      {result.participant_alias && <p>Estudante: <strong>{result.participant_alias}</strong></p>}
      <div className="scoreBox">
        <span>{result.review_complete ? "Resultado final" : "Pontuação parcial"}</span>
        <strong>{result.score ?? 0} / {result.max_score ?? 0}</strong>
      </div>
      {!result.review_complete && <div className="pendingNotice"><Clock3 size={20}/><span>O professor ainda precisa avaliar uma ou mais respostas abertas. Volte com o mesmo código e protocolo para consultar o resultado final.</span></div>}
    </section>

    <section className="resultAnswers">
      {result.answers.map((answer) => {
        const openPending = answer.question_type === "open_text" && !answer.reviewed_at;
        return <article key={answer.position}>
          <div className="resultAnswerTitle">
            <b>{answer.position}</b>
            <strong>{answer.prompt}</strong>
            {openPending ? <span className="status pending"><Clock3 size={17}/> Aguardando</span> : answer.is_correct === true ? <span className="status correct"><CheckCircle2 size={17}/> Correta</span> : answer.is_correct === false ? <span className="status incorrect"><XCircle size={17}/> Incorreta</span> : <span className="status reviewed"><CheckCircle2 size={17}/> Avaliada</span>}
          </div>
          <p><span>Sua resposta:</span> {displayAnswer(answer.answer)}</p>
          <div className="pointsLine">{answer.points_awarded === null ? "Pontuação aguardando avaliação" : String(answer.points_awarded) + " / " + String(answer.max_points) + " ponto(s)"}</div>
          {answer.review_note && <div className="teacherFeedback"><strong>Feedback do professor</strong><p>{answer.review_note}</p></div>}
        </article>;
      })}
    </section>
  </section></main>;
}
