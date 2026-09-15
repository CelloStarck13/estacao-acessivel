"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import "./atividade.css";

export default function NovaAtividadePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/professor");
        return;
      }
      setAuthorized(true);
    });
  }, [router]);

  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setSaving(true);
    setMessage("Salvando atividade...");
    setSaved(false);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setMessage("Sua sessão expirou. Entre novamente para continuar.");
        router.replace("/professor");
        return;
      }

      const payload = {
        owner_id: user.id,
        title: String(form.get("title") ?? "").trim(),
        description: String(form.get("description") ?? "").trim() || null,
        component: String(form.get("component") ?? "").trim() || null,
        school_year: String(form.get("school_year") ?? "").trim() || null,
        learning_objective: String(form.get("learning_objective") ?? "").trim() || null,
        delivery_mode: String(form.get("delivery_mode") ?? "digital"),
        status: "draft",
      };

      const { error } = await supabase.from("activities").insert(payload);

      if (error) {
        setMessage("Não foi possível salvar a atividade. Tente novamente.");
        return;
      }

      formElement.reset();
      setSaved(true);
      setMessage("Atividade salva como rascunho no DUDA.");
    } catch {
      setMessage("Ocorreu um erro ao salvar a atividade.");
    } finally {
      setSaving(false);
    }
  }

  if (!authorized) {
    return <main className="authPage"><section className="authPanel"><p>Verificando acesso...</p></section></main>;
  }

  return (
    <main className="activityCreatePage">
      <section className="activityCreateShell">
        <header className="activityCreateHeader">
          <Link href="/professor/painel"><ArrowLeft size={18} /> Voltar ao painel</Link>
          <span>DUDA — Estação Acessível</span>
        </header>

        <section className="activityCreateCard">
          <h1>Criar nova atividade</h1>
          <p>Preencha os dados essenciais. A atividade será salva como rascunho e poderá receber questões, adaptações e código de acesso na próxima etapa.</p>

          <form className="activityForm" onSubmit={saveActivity}>
            <label>
              Título da atividade
              <input name="title" required maxLength={160} placeholder="Ex.: Missão do Robô — Sequências e Algoritmos" />
            </label>

            <div className="activityFormGrid">
              <label>
                Componente
                <select name="component" defaultValue="Tecnologia e Inovação">
                  <option>Tecnologia e Inovação</option>
                  <option>Programação</option>
                  <option>Robótica</option>
                </select>
              </label>

              <label>
                Ano / série
                <select name="school_year" defaultValue="8º ano">
                  <option>6º ano</option>
                  <option>7º ano</option>
                  <option>8º ano</option>
                  <option>9º ano</option>
                  <option>1ª série EM</option>
                  <option>2ª série EM</option>
                  <option>3ª série EM</option>
                </select>
              </label>
            </div>

            <label>
              Objetivo de aprendizagem
              <textarea name="learning_objective" placeholder="Descreva o que o estudante deverá compreender ou realizar ao final da atividade." />
            </label>

            <label>
              Descrição
              <textarea name="description" placeholder="Resumo da proposta, contexto ou orientação para o professor." />
            </label>

            <label>
              Forma de uso
              <select name="delivery_mode" defaultValue="digital">
                <option value="digital">Digital</option>
                <option value="print">Para impressão</option>
                <option value="both">Digital e impressão</option>
              </select>
            </label>

            {message && <div className={`activitySaveMessage${saved ? " success" : ""}`} role="status">{message}</div>}

            <div className="activityFormActions">
              <button type="submit" disabled={saving}><Save size={18} /> {saving ? "Salvando..." : "Salvar rascunho"}</button>
              <Link href="/professor/painel">Cancelar</Link>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
