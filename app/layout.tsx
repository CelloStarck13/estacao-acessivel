import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DUDA — Estação Acessível",
  description: "Atividades acessíveis de Tecnologia, Programação e Robótica — uma plataforma inspirada por Maria Eduarda.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{__html:`try{const p=JSON.parse(localStorage.getItem("duda-interface-preferences")||"{}");document.documentElement.classList.toggle("duda-large-text",!!p.largeText);document.documentElement.classList.toggle("duda-high-contrast",!!p.highContrast)}catch(e){}`}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
