import { NextResponse } from "next/server";

const institutionalDomains = ["educacao.sp.gov.br", "prof.educacao.sp.gov.br"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const domain = email.split("@")[1] ?? "";

  if (!email.includes("@") || !institutionalDomains.includes(domain)) {
    return NextResponse.json(
      { message: "Use um e-mail institucional da rede estadual de São Paulo." },
      { status: 400 },
    );
  }

  // A geração, armazenamento seguro e envio do código serão conectados
  // ao PostgreSQL e ao provedor de e-mail na próxima etapa.
  return NextResponse.json({
    message: "E-mail institucional validado. O serviço de envio será ativado após a configuração segura do provedor.",
  });
}
