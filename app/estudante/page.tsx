import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function EstudantePage() {
  return <main className="authPage"><section className="authPanel"><Link className="back" href="/"><ArrowLeft /> Voltar</Link><span className="authIcon"><KeyRound /></span><h1>Acessar atividade</h1><p>Digite o código fornecido pelo professor.</p><form><label htmlFor="codigo">Código da atividade</label><input id="codigo" placeholder="Exemplo: TEC8-2046" required /><button type="submit">Abrir atividade</button></form></section></main>;
}
