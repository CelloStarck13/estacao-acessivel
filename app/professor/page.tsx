"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function ProfessorPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.split("@")[1] ?? "";
    const allowedDomains = ["educacao.sp.gov.br", "prof.educacao.sp.gov.br"];

    if (!allowedDomains.includes(domain)) {
      setMessage("Use um e-mail institucional da rede estadual de São Paulo.");
      return;
    }

    setSending(true);
    setMessage("Enviando o acesso seguro...");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/professor/confirmar`,
          shouldCreateUser: true,
        },
      });

      if (!error) {
        setMessage("Acesso enviado. Abra seu e-mail institucional e clique no link recebido.");
        return;
      }

      const errorText = error.message.toLowerCase();

      if (error.status === 429 || errorText.includes("rate limit") || errorText.includes("too many requests")) {
        setMessage("Muitas tentativas de acesso foram realizadas. Aguarde alguns minutos e tente novamente.");
      } else if (errorText.includes("email address not authorized") || errorText.includes("not authorized")) {
        setMessage("Este endereço ainda não está liberado pelo serviço de e-mail de testes. O envio institucional da plataforma está sendo configurado.");
      } else {
        setMessage("Não foi possível enviar o acesso agora. Tente novamente em alguns minutos.");
      }
    } catch {
      setMessage("O serviço de autenticação ainda não está disponível.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authPanel">
        <Link className="back" href="/"><ArrowLeft /> Voltar</Link>
        <span className="authIcon"><Mail /></span>
        <h1>Área do professor</h1>
        <p>Informe seu e-mail institucional. Enviaremos um link seguro para confirmar o acesso.</p>
        <form onSubmit={requestCode}>
          <label htmlFor="email">E-mail institucional</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@educacao.sp.gov.br" required />
          <button type="submit" disabled={sending}>{sending ? "Enviando..." : "Enviar acesso por e-mail"}</button>
        </form>
        {message && <div className="formMessage" role="status">{message}</div>}
        <small><ShieldCheck /> O link terá validade curta e funcionará apenas uma vez.</small>
      </section>
    </main>
  );
}
