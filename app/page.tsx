import Link from "next/link";
import { CheckCircle2, Printer, ScanText, ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <main>
      <Header />
      <section className="hero">
        <div className="heroText">
          <span className="tag">Portal acessível · 2026</span>
          <h1>Atividades acessíveis para aprender com a turma</h1>
          <p>Professores encontram, adaptam e compartilham propostas de Tecnologia, Programação e Robótica. Estudantes participam com os apoios de que precisam.</p>
          <div className="actions">
            <Link className="button primary" href="/professor">Entrar como professor</Link>
            <Link className="button secondary" href="/estudante">Acessar com código</Link>
          </div>
        </div>
        <aside className="accessCard">
          <h2>Acessibilidade desde o início</h2>
          {["Instruções em etapas", "Ampliação e alto contraste", "Navegação por teclado", "Versão digital e para impressão"].map((item) => (
            <p key={item}><CheckCircle2 aria-hidden="true" /> {item}</p>
          ))}
          <div className="privacy"><ShieldCheck aria-hidden="true" /> Nenhum diagnóstico ou laudo aparece nas atividades.</div>
        </aside>
      </section>
      <section className="features" aria-label="Recursos do portal">
        <article><ScanText /><h2>Mesmo objetivo curricular</h2><p>O acesso e a forma de resposta mudam. O objetivo de aprendizagem permanece.</p></article>
        <article><ShieldCheck /><h2>Privacidade</h2><p>A primeira versão não coleta laudos, diagnósticos ou histórico clínico do estudante.</p></article>
        <article><Printer /><h2>Digital e impresso</h2><p>As propostas poderão ser realizadas na tela ou impressas pelo professor.</p></article>
      </section>
    </main>
  );
}
