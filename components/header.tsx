import Link from "next/link";
import { BookOpenCheck, ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <>
      <div className="notice">VERSÃO PRELIMINAR · PROJETO PEDAGÓGICO INDEPENDENTE E NÃO OFICIAL</div>
      <header className="header">
        <Link className="brand" href="/">
          <span className="brandIcon"><BookOpenCheck aria-hidden="true" /></span>
          <span><strong>Estação <em>Acessível</em></strong><small>Tecnologia e Programação</small></span>
        </Link>
        <nav aria-label="Navegação principal">
          <Link href="/professor">Professor</Link>
          <Link href="/estudante">Estudante</Link>
          <Link href="/biblioteca">Biblioteca</Link>
          <Link href="/admin"><ShieldCheck aria-hidden="true" /> ADM</Link>
        </nav>
      </header>
    </>
  );
}
