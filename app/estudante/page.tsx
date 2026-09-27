"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, QrCode } from "lucide-react";

export default function EstudantePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [feedbackCode, setFeedbackCode] = useState("");
  const [protocol, setProtocol] = useState("");

  function openActivity(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/estudante/atividade/${encodeURIComponent(normalized)}`);
  }

  function openFeedback(event: FormEvent) {
    event.preventDefault();
    const normalizedCode = feedbackCode.trim().toUpperCase();
    const normalizedProtocol = protocol.trim();
    if (normalizedCode && normalizedProtocol) {
      router.push(`/estudante/resultado/${encodeURIComponent(normalizedProtocol)}?codigo=${encodeURIComponent(normalizedCode)}`);
    }
  }

  return <main className="authPage"><section className="authPanel">
    <Link className="back" href="/"><ArrowLeft/> Voltar</Link>
    <span className="authIcon"><KeyRound/></span>
    <h1>Acessar atividade</h1>
    <p>Use o link ou QR Code entregue pelo professor. Se preferir, digite o código curto.</p>
    <form onSubmit={openActivity}>
      <label htmlFor="codigo">Código da atividade</label>
      <input id="codigo" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Exemplo: ABC-2046" autoCapitalize="characters" required/>
      <button type="submit">Abrir atividade</button>
    </form>
    <small><QrCode size={15}/> O QR Code abre esta atividade diretamente, sem e-mail e sem cadastro.</small>
    <hr/>
    <h2>Consultar devolutiva</h2>
    <p>Depois de responder, use o código da atividade e o protocolo recebido no envio para consultar a correção.</p>
    <form onSubmit={openFeedback}>
      <label htmlFor="feedback-code">Código da atividade</label>
      <input id="feedback-code" value={feedbackCode} onChange={(e) => setFeedbackCode(e.target.value)} placeholder="Exemplo: ABC-2046" autoCapitalize="characters" required/>
      <label htmlFor="feedback-protocol">Protocolo da devolutiva</label>
      <input id="feedback-protocol" value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="Cole o protocolo recebido" required/>
      <button type="submit">Ver devolutiva</button>
    </form>
  </section></main>;
}
