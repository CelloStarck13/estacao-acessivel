import { Header } from "@/components/header";

export default function AdminPage() {
  return <main><Header /><section className="content"><span className="tag">Acesso restrito</span><h1>Painel administrativo</h1><p>Esta rota receberá autenticação exclusiva, revisão, publicação, escopos, acessibilidade, gabaritos, exportações e estatísticas.</p></section></main>;
}
