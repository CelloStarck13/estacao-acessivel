import Link from "next/link";
import { Header } from "@/components/header";

export default function BibliotecaPage() {
  return <main><Header /><section className="content"><span className="tag">Biblioteca pública</span><h1>Atividades revisadas e publicadas</h1><p>A busca por série, componente, bimestre e recurso de acessibilidade será conectada ao banco curricular.</p><Link className="button primary" href="/">Voltar ao início</Link></section></main>;
}
