"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

export default function ProfessorPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setMessage("Validando o e-mail institucional...");
    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setMessage(data.message);
  }

  return (
    <main className="authPage">
      <section className="authPanel">
        <Link className="back" href="/"><ArrowLeft /> Voltar</Link>
        <span className="authIcon"><Mail /></span>
        <h1>Área do professor</h1>
        <p>Informe seu e-mail institucional. Enviaremos um código temporário para confirmar o acesso.</p>
        <form onSubmit={requestCode}>
          <label htmlFor="email">E-mail institucional</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@educacao.sp.gov.br" required />
          <button type="submit">Enviar código de acesso</button>
        </form>
        {message && <div className="formMessage" role="status">{message}</div>}
        {message && !message.startsWith("Use") && <Link className="demoPanelLink" href="/professor/painel">Visualizar painel do professor</Link>}
        <small><ShieldCheck /> O código terá validade curta e funcionará apenas uma vez.</small>
      </section>
    </main>
  );
}
