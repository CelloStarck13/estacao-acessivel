"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function ConfirmarAcessoPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirmando seu acesso...");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function confirm() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/professor/painel");
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) router.replace("/professor/painel");
      });

      window.setTimeout(() => {
        setMessage("O acesso não pôde ser confirmado. Solicite um novo e-mail.");
      }, 8000);

      return () => listener.subscription.unsubscribe();
    }

    void confirm();
  }, [router]);

  return (
    <main className="authPage">
      <section className="authPanel">
        <span className="authIcon"><ShieldCheck /></span>
        <h1>Confirmação de acesso</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
