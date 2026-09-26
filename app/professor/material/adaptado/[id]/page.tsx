"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, FileCode2, Trash2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./adaptado.css";

type AdaptedQuestion = {
  index: number;
  prompt: string;
  type: "open_text" | "multiple_choice";
  options?: string[];
  source: "original" | "generated";
};

type AdaptedPayload = {
  title?: string;
  studentIntro?: string;
  taskInstruction?: string;
  blocks?: Array<{ index: number; text: string; kind: string }>;
  questions?: AdaptedQuestion[];
  teacherGuidance?: string[];
  aeeGuidance?: string[];
  supportsApplied?: string[];
  structure?: { materialType?: string; sourceQuestionCount?: number };
};

type AdaptationRow = {
  id: string;
  title: string;
  source_file_name: string | null;
  source_type: string;
  learner_profiles: string[] | null;
  support_needs: string[] | null;
  communication_modes: string[] | null;
  autonomy_level: string;
  response_modes: string[] | null;
  adapted_payload: AdaptedPayload;
  status: string;
  created_at: string;
};

export default function MaterialAdaptadoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<AdaptationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/professor");
        return;
      }
      const { data: adaptation, error: loadError } = await supabase
        .from("material_adaptations")
        .select("id,title,source_file_name,source_type,learner_profiles,support_needs,communication_modes,autonomy_level,response_modes,adapted_payload,status,created_at")
        .eq("id", id)
        .eq("owner_id", data.session.user.id)
        .maybeSingle();

      if (loadError || !adaptation) setError("Material adaptado não encontrado.");
      else setRow(adaptation as AdaptationRow);
      setLoading(false);
    });
  }, [id, router]);

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function remove() {
    if (!row) return;
    if (!window.confirm(`Excluir definitivamente “${row.title}”? Esta ação não pode ser desfeita.`)) return;
    const supabase = createBrowserSupabaseClient();
    const { error: deleteError } = await supabase.from("material_adaptations").delete().eq("id", row.id);
    if (deleteError) {
      window.alert("Não foi possível excluir o material adaptado.");
      return;
    }
    router.replace("/professor/painel");
  }

  if (loading) return <main className="adaptedPage"><section className="adaptedShell">Carregando material adaptado...</section></main>;
  if (error || !row) return <main className="adaptedPage"><section className="adaptedShell"><Link href="/professor/painel"><ArrowLeft/> Voltar ao painel</Link><h1>Material indisponível</h1><p>{error}</p></section></main>;

  const payload = row.adapted_payload ?? {};
  return <main className="adaptedPage"><section className="adaptedShell">
    <header className="adaptedTop"><Link href="/professor/painel"><ArrowLeft/> Voltar ao painel</Link><button type="button" onClick={() => void remove()}><Trash2/> Excluir</button></header>

    <section className="adaptedHero">
      <FileCode2/>
      <div><small>MATERIAL ADAPTADO • {row.status === "draft" ? "RASCUNHO" : row.status.toUpperCase()}</small><h1>{row.title}</h1><p><CalendarClock/> Criado em {formatDateTime(row.created_at)}</p>{row.source_file_name && <p>Arquivo de origem: {row.source_file_name}</p>}</div>
    </section>

    <section className="adaptedMeta">
      <div><b>Perfil informado</b><span>{(row.learner_profiles ?? []).join(", ") || "Nenhum perfil específico"}</span></div>
      <div><b>Autonomia</b><span>{row.autonomy_level === "intensive" ? "Apoio intenso" : row.autonomy_level === "autonomous" ? "Maior autonomia" : "Apoio moderado"}</span></div>
      <div><b>Formas de resposta</b><span>{(row.response_modes ?? []).join(", ") || "Não informado"}</span></div>
    </section>

    <section className="adaptedCard">
      <small>PRÉVIA DO ESTUDANTE</small>
      <h2>{payload.title || row.title}</h2>
      {payload.studentIntro && <p>{payload.studentIntro}</p>}
      {payload.taskInstruction && <div className="taskBox">{payload.taskInstruction}</div>}
      <div className="adaptedBlocks">{(payload.blocks ?? []).map((block) => <article key={block.index}><span>{block.index}</span><p>{block.text}</p></article>)}</div>
    </section>

    {(payload.questions ?? []).length > 0 && <section className="adaptedCard">
      <h2>Questões adaptadas</h2>
      <div className="savedQuestions">{(payload.questions ?? []).map((question) => <article key={question.index}><header><b>{question.index}</b><span>{question.prompt}</span><small>{question.source === "original" ? "preservada do original" : "criada a partir do material"}</small></header>
        {question.type === "multiple_choice" && question.options?.length ? <ul>{question.options.map((option) => <li key={option}>{option}</li>)}</ul> : <div className="answerBox">Espaço de resposta do estudante</div>}
      </article>)}</div>
    </section>}

    <div className="guidanceSaved">
      <section><h2>Professor regente</h2><ul>{(payload.teacherGuidance ?? []).map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h2>AEE / apoio</h2><ul>{(payload.aeeGuidance ?? []).map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>

    {(payload.supportsApplied ?? []).length > 0 && <section className="adaptedCard"><h2>Apoios aplicados</h2><div className="savedTags">{(payload.supportsApplied ?? []).map((item) => <span key={item}>{item}</span>)}</div></section>}
  </section></main>;
}
