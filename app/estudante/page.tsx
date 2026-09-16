"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, QrCode } from "lucide-react";

export default function EstudantePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function openActivity(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/estudante/atividade/${encodeURIComponent(normalized)}`);
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
  </section></main>;
}
