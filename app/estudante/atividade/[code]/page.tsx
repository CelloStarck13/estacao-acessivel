"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Contrast, Minus, Plus, Volume2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./student-activity.css";

type Question = { id: string; position: number; prompt: string; question_type: "instruction"|"open_text"|"multiple_choice"|"true_false"; options: string[]; accessibility_support: string|null; points: number };
type Activity = { id: string; title: string; description: string|null; component: string|null; school_year: string|null; learning_objective: string|null; support_needs: string[]; questions: Question[] };

export default function StudentActivityPage() {
  const { code } = useParams<{ code: string }>();
  const [activity, setActivity] = useState<Activity|null>(null);
  const [answers, setAnswers] = useState<Record<string, string|boolean>>({});
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.rpc("get_published_activity", { p_access_code: decodeURIComponent(code) }).then(({ data, error: rpcError }) => {
      if (rpcError || !data) setError("Código inválido ou atividade ainda não publicada.");
      else setActivity(data as Activity);
      setLoading(false);
    });
  }, [code]);

  function read(text: string) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text); speech.lang = "pt-BR"; window.speechSynthesis.speak(speech);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!activity) return;
    const rows = activity.questions.filter((q) => q.question_type !== "instruction").map((q) => ({ question_id: q.id, answer: answers[q.id] ?? "" }));
    const supabase = createBrowserSupabaseClient();
    const { error: submitError } = await supabase.rpc("submit_activity", { p_access_code: decodeURIComponent(code), p_answers: rows, p_participant_alias: alias || null });
    if (submitError) setError("Não foi possível enviar. Confira sua conexão e tente novamente."); else setFinished(true);
  }

  if (loading) return <main className="studentPage"><section className="studentShell"><p>Carregando atividade...</p></section></main>;
  if (error && !activity) return <main className="studentPage"><section className="studentShell errorBox"><h1>Atividade indisponível</h1><p>{error}</p><Link href="/estudante">Digitar outro código</Link></section></main>;
  if (finished) return <main className="studentPage"><section className="studentShell finishBox"><CheckCircle2 size={64}/><h1>Atividade concluída!</h1><p>Suas respostas foram enviadas ao professor.</p><Link href="/">Concluir</Link></section></main>;
  if (!activity) return null;

  return <main className={contrast ? "studentPage highContrast" : "studentPage"} style={{ fontSize: `${fontScale}rem` }}><section className="studentShell">
    <header className="studentTools"><Link href="/estudante"><ArrowLeft size={18}/> Sair</Link><div><button type="button" onClick={() => setFontScale(Math.max(.9, fontScale-.1))} aria-label="Diminuir texto"><Minus/></button><button type="button" onClick={() => setFontScale(Math.min(1.5, fontScale+.1))} aria-label="Aumentar texto"><Plus/></button><button type="button" onClick={() => setContrast(!contrast)} aria-label="Alternar contraste"><Contrast/></button></div></header>
    <section className="studentHero"><small>{activity.component} · {activity.school_year}</small><h1>{activity.title}</h1>{activity.description && <p>{activity.description}</p>}<button className="readButton" type="button" onClick={() => read(`${activity.title}. ${activity.description ?? ""}`)}><Volume2/> Ouvir apresentação</button></section>
    <form className="studentForm" onSubmit={submit}>
      <label className="aliasField">Como o professor identificará esta resposta? <span>(opcional)</span><input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Nome, iniciais ou número combinado"/></label>
      {activity.questions.map((q) => <fieldset key={q.id} className="studentQuestion"><legend><b>{q.position}</b>{q.prompt}<button type="button" onClick={() => read(q.prompt)} aria-label="Ouvir questão"><Volume2/></button></legend>{q.accessibility_support && <p className="supportHint">Apoio: {q.accessibility_support}</p>}
        {q.question_type === "instruction" ? <p>Leia ou ouça esta orientação antes de continuar.</p> : q.question_type === "open_text" ? <textarea rows={4} value={String(answers[q.id] ?? "")} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} aria-label="Sua resposta"/> : <div className="answerOptions">{q.options.map((option) => { const value = q.question_type === "true_false" ? option === "Verdadeiro" : option; return <label key={option}><input type="radio" name={q.id} checked={answers[q.id] === value} onChange={() => setAnswers({ ...answers, [q.id]: value })}/><span>{option}</span></label>; })}</div>}
      </fieldset>)}
      {error && <p className="submitError" role="alert">{error}</p>}<button className="submitActivity" type="submit">Enviar respostas</button>
    </form>
  </section></main>;
}
