"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Edit3, Plus, QrCode, Send, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./atividade-view.css";
import "./editor.css";

type QuestionType = "open_text" | "multiple_choice" | "true_false" | "instruction";
type Question = { id: string; position: number; prompt: string; question_type: QuestionType; options: string[]; correct_answer: string | boolean | null; accessibility_support: string | null; points: number };
type Activity = { id: string; title: string; description: string | null; component: string | null; school_year: string | null; term: string | null; theme: string | null; learning_objective: string | null; status: string; access_code: string | null };
const emptyQuestion = { prompt: "", question_type: "multiple_choice" as QuestionType, options: ["", ""], correct_answer: "" as string | boolean, accessibility_support: "", points: 1 };

function createCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const prefix = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function ActivityEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [qrData, setQrData] = useState("");

  const studentLink = useMemo(() => {
    if (!activity?.access_code || typeof window === "undefined") return "";
    return `${window.location.origin}/estudante/atividade/${activity.access_code}`;
  }, [activity?.access_code]);

  const load = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { router.replace("/professor"); return; }
    const { data, error } = await supabase.from("activities").select("id,title,description,component,school_year,term,theme,learning_objective,status,access_code").eq("id", params.id).single();
    if (error || !data) { setMessage("Não foi possível carregar esta atividade."); setLoading(false); return; }
    const { data: rows } = await supabase.from("questions").select("id,position,prompt,question_type,options,correct_answer,accessibility_support,points").eq("activity_id", params.id).order("position");
    setActivity(data as Activity); setQuestions((rows ?? []) as Question[]); setLoading(false);
  }, [params.id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (studentLink) void QRCode.toDataURL(studentLink, { width: 240, margin: 1 }).then(setQrData); }, [studentLink]);

  function updateOption(index: number, value: string) { setDraft((current) => ({ ...current, options: current.options.map((item, i) => i === index ? value : item) })); }

  async function saveQuestion(event: FormEvent) {
    event.preventDefault();
    if (!draft.prompt.trim()) { setMessage("Digite o enunciado da questão."); return; }
    const options = draft.question_type === "multiple_choice" ? draft.options.map((v) => v.trim()).filter(Boolean) : draft.question_type === "true_false" ? ["Verdadeiro", "Falso"] : [];
    if (draft.question_type === "multiple_choice" && options.length < 2) { setMessage("Informe pelo menos duas alternativas."); return; }
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const correct = draft.question_type === "true_false" ? draft.correct_answer === "true" : draft.question_type === "multiple_choice" ? draft.correct_answer || null : null;
    const payload = { activity_id: params.id, position: editingId ? questions.find((q) => q.id === editingId)?.position : questions.length + 1, prompt: draft.prompt.trim(), question_type: draft.question_type, options, correct_answer: correct, accessibility_support: draft.accessibility_support.trim() || null, points: draft.points };
    const result = editingId ? await supabase.from("questions").update(payload).eq("id", editingId) : await supabase.from("questions").insert(payload);
    if (result.error) setMessage(`Não foi possível salvar a questão: ${result.error.message}`);
    else { setDraft(emptyQuestion); setEditingId(null); setMessage("Questão salva."); await load(); }
    setSaving(false);
  }

  function editQuestion(question: Question) {
    setEditingId(question.id);
    setDraft({ prompt: question.prompt, question_type: question.question_type, options: question.options?.length ? question.options : ["", ""], correct_answer: typeof question.correct_answer === "boolean" ? String(question.correct_answer) : question.correct_answer ?? "", accessibility_support: question.accessibility_support ?? "", points: Number(question.points) });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function removeQuestion(id: string) {
    if (!window.confirm("Excluir esta questão?")) return;
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) { setMessage("Não foi possível excluir a questão."); return; }
    setMessage("Questão excluída."); await load();
  }

  async function publish() {
    if (!questions.length) { setMessage("Adicione pelo menos uma questão antes de publicar."); return; }
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    let code = activity?.access_code ?? createCode(); let error = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await supabase.from("activities").update({ status: "published", is_public: true, access_code: code, published_at: new Date().toISOString() }).eq("id", params.id);
      error = result.error; if (!error) break; code = createCode();
    }
    if (error) setMessage(`Não foi possível publicar: ${error.message}`);
    else { setMessage("Atividade publicada. Código, link e QR Code estão prontos."); await load(); }
    setSaving(false);
  }

  async function copy(value: string) { await navigator.clipboard.writeText(value); setMessage("Copiado."); }

  if (loading) return <main className="previewPage"><section className="previewShell"><p>Carregando atividade...</p></section></main>;
  if (!activity) return <main className="previewPage"><section className="previewShell"><p>{message}</p></section></main>;

  return <main className="previewPage"><section className="previewShell">
    <header className="previewHeader"><Link href="/professor/painel"><ArrowLeft size={18}/> Voltar ao painel</Link><span>{activity.status === "published" ? "Publicada" : "Rascunho salvo"}</span></header>
    <section className="heroPreview"><div><small>{activity.status === "published" ? "ATIVIDADE PUBLICADA" : "EDIÇÃO DA ATIVIDADE"}</small><h1>{activity.title}</h1><p>{activity.description}</p><div className="metaTags"><span>{activity.component}</span><span>{activity.school_year}</span>{activity.term && <span>{activity.term}</span>}</div></div></section>
    <section className="previewCard objectiveCard"><h2>Objetivo de aprendizagem</h2><p>{activity.learning_objective || "Objetivo ainda não informado."}</p></section>
    <section className="previewCard"><h2>Questões</h2><p>{questions.length} questão(ões) cadastrada(s).</p><div className="teacherQuestionList">{questions.map((q) => <article key={q.id}><b>{q.position}</b><div><strong>{q.prompt}</strong><small>{q.question_type.replace("_", " ")} · {q.points} ponto(s)</small>{q.options.length > 0 && <ul>{q.options.map((o) => <li key={o}>{o}</li>)}</ul>}</div><div className="rowActions"><button type="button" onClick={() => editQuestion(q)} aria-label="Editar"><Edit3 size={17}/></button><button type="button" onClick={() => void removeQuestion(q.id)} aria-label="Excluir"><Trash2 size={17}/></button></div></article>)}</div></section>
    <form className="previewCard questionEditor" onSubmit={saveQuestion}><h2><Plus size={19}/> {editingId ? "Editar questão" : "Adicionar questão"}</h2>
      <label>Tipo<select value={draft.question_type} onChange={(e) => setDraft({ ...draft, question_type: e.target.value as QuestionType, correct_answer: "" })}><option value="multiple_choice">Múltipla escolha</option><option value="true_false">Verdadeiro ou falso</option><option value="open_text">Resposta aberta</option><option value="instruction">Somente instrução</option></select></label>
      <label>Enunciado<textarea value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} rows={3}/></label>
      {draft.question_type === "multiple_choice" && <fieldset><legend>Alternativas</legend>{draft.options.map((option, index) => <div className="optionRow" key={index}><input value={option} onChange={(e) => updateOption(index, e.target.value)} placeholder={`Alternativa ${index + 1}`}/><label className="correctChoice"><input type="radio" name="correct" checked={draft.correct_answer === option && !!option} onChange={() => setDraft({ ...draft, correct_answer: option })}/> correta</label></div>)}<button className="textButton" type="button" onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}>+ alternativa</button></fieldset>}
      {draft.question_type === "true_false" && <label>Resposta correta<select value={String(draft.correct_answer)} onChange={(e) => setDraft({ ...draft, correct_answer: e.target.value })}><option value="">Selecione</option><option value="true">Verdadeiro</option><option value="false">Falso</option></select></label>}
      <div className="formColumns"><label>Apoio acessível<input value={draft.accessibility_support} onChange={(e) => setDraft({ ...draft, accessibility_support: e.target.value })} placeholder="Ex.: ler em voz alta"/></label><label>Pontos<input type="number" min="0" step="0.5" value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}/></label></div>
      <div className="editorActions"><button className="primary" disabled={saving} type="submit"><Check size={17}/> {editingId ? "Salvar alteração" : "Adicionar questão"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyQuestion); }}>Cancelar edição</button>}</div>
    </form>
    {activity.status !== "published" ? <section className="publishBox"><div><h2>Pronto para o estudante?</h2><p>Ao publicar, o DUDA gerará código, link e QR Code.</p></div><button disabled={saving || !questions.length} onClick={() => void publish()}><Send size={18}/> Publicar atividade</button></section> : <section className="previewCard shareBox"><h2><QrCode size={20}/> Compartilhar com o estudante</h2><div className="shareGrid"><div><label>Código curto</label><div className="copyField"><strong>{activity.access_code}</strong><button onClick={() => void copy(activity.access_code ?? "")}><Copy size={17}/></button></div><label>Link direto</label><div className="copyField"><input readOnly value={studentLink}/><button onClick={() => void copy(studentLink)}><Copy size={17}/></button></div></div>{qrData && <Image src={qrData} width={200} height={200} unoptimized alt={`QR Code da atividade ${activity.title}`}/>}</div></section>}
    {message && <p className="statusMessage" role="status">{message}</p>}
  </section></main>;
}
