"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Contrast, Minus, Plus, Volume2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./student-activity.css";

type Question = {
  id: string;
  position: number;
  prompt: string;
  question_type: "instruction" | "open_text" | "multiple_choice" | "true_false";
  options: string[];
  accessibility_support: string | null;
  points: number;
  media_url: string | null;
  media_alt: string | null;
  media_caption: string | null;
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
  component: string | null;
  school_year: string | null;
  learning_objective: string | null;
  learner_profiles: string[];
  access_barriers: string[];
  support_needs: string[];
  communication_modes: string[];
  autonomy_level: string | null;
  response_modes: string[];
  questions: Question[];
};

function includesAny(values: string[] | undefined, patterns: RegExp[]) {
  return (values ?? []).some((value) => patterns.some((pattern) => pattern.test(value)));
}

export default function StudentActivityPage() {
  const { code } = useParams<{ code: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [feedbackToken, setFeedbackToken] = useState("");
  const [fontScale, setFontScale] = useState(1);
  const [contrast, setContrast] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.rpc("get_published_activity", { p_access_code: decodeURIComponent(code) }).then(({ data, error: rpcError }) => {
      if (rpcError || !data) {
        setError("Código inválido ou atividade ainda não publicada.");
      } else {
        setActivity(data as Activity);
        setCurrentQuestion(0);
      }
      setLoading(false);
    });
  }, [code]);

  function read(text: string) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "pt-BR";
    window.speechSynthesis.speak(speech);
  }

  function hasAnswer(question: Question) {
    if (!Object.prototype.hasOwnProperty.call(answers, question.id)) return false;
    const answer = answers[question.id];
    return typeof answer === "string" ? Boolean(answer.trim()) : typeof answer === "boolean";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activity) return;

    const unanswered = activity.questions.filter((question) => question.question_type !== "instruction" && !hasAnswer(question));
    if (unanswered.length) {
      setError("Responda as questões antes de enviar.");
      const firstMissing = activity.questions.findIndex((question) => question.id === unanswered[0].id);
      if (firstMissing >= 0) setCurrentQuestion(firstMissing);
      return;
    }

    const rows = activity.questions
      .filter((q) => q.question_type !== "instruction")
      .map((q) => ({ question_id: q.id, answer: answers[q.id] ?? "" }));

    const supabase = createBrowserSupabaseClient();
    const { data: submitData, error: submitError } = await supabase.rpc("submit_activity", {
      p_access_code: decodeURIComponent(code),
      p_answers: rows,
      p_participant_alias: alias || null,
    });

    if (submitError || !submitData?.feedback_token) {
      setError("Não foi possível enviar. Confira sua conexão e tente novamente.");
    } else {
      setFeedbackToken(String(submitData.feedback_token));
      setFinished(true);
    }
  }

  if (loading) return <main className="studentPage"><section className="studentShell"><p>Carregando atividade...</p></section></main>;
  if (error && !activity) return <main className="studentPage"><section className="studentShell errorBox"><h1>Atividade indisponível</h1><p>{error}</p><Link href="/estudante">Digitar outro código</Link></section></main>;
  if (finished) return <main className="studentPage"><section className="studentShell finishBox"><CheckCircle2 size={64}/><h1>Atividade concluída!</h1><p>Suas respostas foram enviadas ao professor.</p><div className="feedbackProtocol"><span>Protocolo da devolutiva</span><strong>{feedbackToken}</strong><small>Guarde este protocolo junto com o código da atividade. Ele permite consultar sua devolutiva depois da correção.</small></div><Link href={`/estudante/resultado/${encodeURIComponent(feedbackToken)}?codigo=${encodeURIComponent(decodeURIComponent(code))}`}>Ver devolutiva</Link><Link className="finishSecondary" href="/estudante">Concluir</Link></section></main>;
  if (!activity) return null;

  const profiles = activity.learner_profiles ?? [];
  const supports = activity.support_needs ?? [];
  const communicationModes = activity.communication_modes ?? [];

  const isBlind = includesAny(profiles, [/Cegueira/i]);
  const isDeaf = includesAny(profiles, [/Surdez/i, /Deficiência auditiva/i]);
  const isTEA = includesAny(profiles, [/TEA/i]);
  const isDown = includesAny(profiles, [/Síndrome de Down/i]);
  const usesLibras = includesAny([...supports, ...communicationModes], [/Libras/i]);
  const stepByStep = isTEA || isDown || includesAny(supports, [/Uma etapa por vez/i]);
  const lowStimulus = isTEA || includesAny(supports, [/Menos estímulos visuais/i, /Redução de carga cognitiva/i]);
  const questionsToShow = stepByStep ? [activity.questions[currentQuestion]].filter(Boolean) : activity.questions;
  const activeQuestion = activity.questions[currentQuestion];
  const canAdvance = activeQuestion ? activeQuestion.question_type === "instruction" || hasAnswer(activeQuestion) : false;
  const isLastQuestion = currentQuestion === activity.questions.length - 1;

  return (
    <main className={contrast ? "studentPage highContrast" : "studentPage"} style={{ fontSize: `${fontScale}rem` }}>
      <section className="studentShell">
        <header className="studentTools">
          <Link href="/estudante"><ArrowLeft size={18}/> Sair</Link>
          <div>
            <button type="button" onClick={() => setFontScale(Math.max(.9, fontScale - .1))} aria-label="Diminuir texto"><Minus/></button>
            <button type="button" onClick={() => setFontScale(Math.min(1.5, fontScale + .1))} aria-label="Aumentar texto"><Plus/></button>
            <button type="button" onClick={() => setContrast(!contrast)} aria-label="Alternar contraste"><Contrast/></button>
          </div>
        </header>

        <section className="studentHero">
          <small>{activity.component} · {activity.school_year}</small>
          <h1>{activity.title}</h1>
          {!lowStimulus && activity.description && <p>{activity.description}</p>}
          {stepByStep && <p className="studentModeNote">Você verá uma questão por vez. Responda e avance quando estiver pronto.</p>}
          {isDeaf && <p className="studentModeNote">As informações necessárias para responder estão disponíveis em texto e apoio visual.{usesLibras ? " A atividade foi preparada para permitir mediação em Libras." : ""}</p>}
          {isBlind && <p className="studentModeNote">Os apoios visuais importantes possuem descrição textual. Você pode responder sem depender da imagem.</p>}
          {isDown && <p className="studentModeNote">Leia uma opção de cada vez. Você pode voltar à questão anterior quando precisar.</p>}
          {!isDeaf && <button className="readButton" type="button" onClick={() => read(`${activity.title}. ${activity.description ?? ""}`)}><Volume2/> Ouvir apresentação</button>}
        </section>

        <form className="studentForm" onSubmit={submit}>
          <label className="aliasField">
            Identificação do estudante <span>(opcional)</span>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Nome, iniciais ou código combinado"/>
          </label>

          {stepByStep && (
            <div className="stepProgress" role="status" aria-live="polite">
              <strong>Questão {currentQuestion + 1} de {activity.questions.length}</strong>
              <div className="progressTrack" aria-hidden="true"><span style={{ width: `${((currentQuestion + 1) / activity.questions.length) * 100}%` }}/></div>
            </div>
          )}

          {questionsToShow.map((q) => (
            <fieldset key={q.id} className="studentQuestion">
              <legend>
                <b>{q.position}</b>
                <span>{q.prompt}</span>
                {!isDeaf && <button type="button" onClick={() => read(q.prompt)} aria-label="Ouvir questão"><Volume2/></button>}
              </legend>

              {q.media_url && q.media_alt && isBlind && (
                <div className="visualDescription" role="note">
                  <strong>Descrição do apoio visual:</strong> {q.media_alt}.{q.media_caption ? ` ${q.media_caption}` : ""}
                </div>
              )}

              {q.media_url && q.media_alt && !isBlind && (
                <figure className="questionMedia">
                  <Image src={q.media_url} alt={q.media_alt} width={800} height={420}/>
                  {q.media_caption && <figcaption>{q.media_caption}</figcaption>}
                </figure>
              )}

              {q.question_type === "instruction" ? (
                <p>Leia esta orientação antes de continuar.</p>
              ) : q.question_type === "open_text" ? (
                <textarea
                  rows={lowStimulus ? 3 : 4}
                  value={String(answers[q.id] ?? "")}
                  onChange={(e) => {
                    setAnswers({ ...answers, [q.id]: e.target.value });
                    setError("");
                  }}
                  aria-label="Sua resposta"
                />
              ) : (
                <div className="answerOptions">
                  {q.options.map((option) => {
                    const value = q.question_type === "true_false" ? option === "Verdadeiro" : option;
                    return (
                      <label key={option}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === value}
                          onChange={() => {
                            setAnswers({ ...answers, [q.id]: value });
                            setError("");
                          }}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          ))}

          {error && <p className="submitError" role="alert">{error}</p>}

          {stepByStep ? (
            <div className="stepActions">
              <button
                className="secondaryStep"
                type="button"
                disabled={currentQuestion === 0}
                onClick={() => {
                  setCurrentQuestion((value) => Math.max(0, value - 1));
                  setError("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Questão anterior
              </button>

              {!isLastQuestion ? (
                <button
                  className="primaryStep"
                  type="button"
                  disabled={!canAdvance}
                  onClick={() => {
                    setCurrentQuestion((value) => Math.min(activity.questions.length - 1, value + 1));
                    setError("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Próxima questão
                </button>
              ) : (
                <button className="submitActivity" type="submit" disabled={!canAdvance}>Enviar respostas</button>
              )}
            </div>
          ) : (
            <button className="submitActivity" type="submit">Enviar respostas</button>
          )}
        </form>
      </section>
    </main>
  );
}
