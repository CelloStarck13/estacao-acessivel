import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DUDA — Estação Acessível",
  description: "Atividades acessíveis de Tecnologia, Programação e Robótica — uma plataforma inspirada por Maria Eduarda.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
