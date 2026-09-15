"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, EyeOff, FileQuestion, ShieldCheck, Sparkles } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./atividade-view.css";

type Question = {
  id: string;
  position: number;
  prompt: string;
  question_type: string;
  options: string[];
};

type GeneratedContent = {
  instructions?: string[];
  supportsApplied?: string[];
  responseGuidance?: string[];
  teacherNotes?: string[];
  assessment?: string[];
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
  component: string | null;
  school_year: string | null;
  term: string | null;
  theme: string | null;
  learning_objective: string | null;
  delivery_mode: string;
  creation_mode: string;
  learner_profiles: string[];
  support_needs: string[];
  autonomy_level: string | null;
  response_modes: string[];
  generated_content: GeneratedContent | null;
  status: string;
};

const autonomyLabel: Record<string, string> = {
  intensive: "Apoio intenso",
  moderate: "Apoio moderado",
  autonomous: "Maior autonomia",
};

export default function ActivityPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/professor");
        return;
      }

      const { data, error } = await supabase
        .from("activities")
        .select("id,title,description,component,school_year,term,theme,learning_objective,delivery_mode,creation_mode,learner_profiles,support_needs,autonomy_level,response_modes,generated_content,status")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setMessage("Não foi possível carregar esta atividade.");
        setLoading(false);
        return;
      }

      const { data: questionData } = await supabase
        .from("questions")
        .select("id,position,prompt,question_type,options")
        .eq("activity_id", params.id)
        .order("position");

      setActivity(data as Activity);
      setQuestions((questionData ?? []) as Question[]);
      setLoading(false);
    }

    void load();
  }, [params.id, router]);

  if (loading) return <main className="previewPage"><section className="previewShell"><p>Montando sua atividade...</p></section></main>;
  if (!activity) return <main className="previewPage"><section className="previewShell"><p>{message}</p><Link href="/professor/painel">Voltar ao painel</Link></section></main>;

  const generated = activity.generated_content;

  return (
    <main className="previewPage">
      <section className="previewShell">
        <header className="previewHeader">
          <Link href="/professor/painel"><ArrowLeft size={18} /> Voltar ao painel</Link>
          <span><CheckCircle2 size={16} /> Rascunho salvo no DUDA</span>
        </header>

        <section className="heroPreview">
          <div>
            <small>{activity.creation_mode === "automatic" ? "GERADA AUTOMATICAMENTE" : "PREENCHIMENTO MANUAL"}</small>
            <h1>{activity.title}</h1>
            <p>{activity.description}</p>
            <div className="metaTags"><span>{activity.component}</span><span>{activity.school_year}</span>{activity.term && <span>{activity.term}</span>}{activity.theme && <span>{activity.theme}</span>}</div>
          </div>
          <Sparkles size={46} />
        </section>

        <section className="previewGrid">
          <article className="previewCard objectiveCard">
            <h2>Objetivo de aprendizagem</h2>
            <p>{activity.learning_objective || "Objetivo ainda não informado."}</p>
          </article>

          <article className="previewCard privacyCard">
            <h2><EyeOff size={19} /> Informação restrita ao professor</h2>
            <p>Perfil/condição nunca será exibido na versão do estudante, no PDF, QR Code ou link compartilhado.</p>
            <div className="tagList">{activity.learner_profiles?.length ? activity.learner_profiles.map((item) => <span key={item}>{item}</span>) : <span>Nenhum diagnóstico informado</span>}</div>
          </article>
        </section>

        {generated ? (
          <>
            <section className="previewCard">
              <h2>Como aplicar</h2>
              <ol>{(generated.instructions ?? []).map((item) => <li key={item}>{item}</li>)}</ol>
            </section>

            <section className="previewGrid">
              <article className="previewCard">
                <h2><ShieldCheck size={19} /> Apoios incorporados</h2>
                <div className="tagList supports">{(generated.supportsApplied ?? []).length ? generated.supportsApplied?.map((item) => <span key={item}>{item}</span>) : <span>Sem apoio adicional selecionado</span>}</div>
                <p className="detailLine"><b>Autonomia:</b> {activity.autonomy_level ? autonomyLabel[activity.autonomy_level] : "Não informada"}</p>
              </article>
              <article className="previewCard">
                <h2>Formas de resposta</h2>
                <div className="tagList">{activity.response_modes?.map((item) => <span key={item}>{item}</span>)}</div>
                <ul>{(generated.responseGuidance ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            </section>

            <section className="previewCard">
              <h2><FileQuestion size={19} /> Desafios gerados</h2>
              <div className="questionList">{questions.map((question) => <article key={question.id}><b>{question.position}</b><div><p>{question.prompt}</p>{question.options?.length > 0 && <ul>{question.options.map((option) => <li key={option}>{option}</li>)}</ul>}</div></article>)}</div>
            </section>

            <section className="previewGrid">
              <article className="previewCard">
                <h2>Critérios de acompanhamento</h2>
                <ul>{(generated.assessment ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article className="previewCard teacherCard">
                <h2>Orientações ao professor</h2>
                <ul>{(generated.teacherNotes ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            </section>
          </>
        ) : (
          <section className="previewCard"><h2>Rascunho manual salvo</h2><p>Os dados foram gravados. Questões, apoios e versão de compartilhamento serão acrescentados na próxima etapa.</p></section>
        )}

        <footer className="previewActions">
          <Link className="primary" href="/professor/atividade/nova"><Sparkles size={17} /> Criar outra atividade</Link>
          <Link href="/professor/painel">Voltar ao painel</Link>
        </footer>
      </section>
    </main>
  );
}
