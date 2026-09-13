import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estação Acessível",
  description: "Atividades acessíveis de Tecnologia e Programação",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
