# DUDA — Estação Acessível

Portal de atividades acessíveis de Tecnologia, Programação e Robótica para a rede pública estadual de São Paulo.

## Identidade

**DUDA — Estação Acessível** é a identidade oficial da plataforma anteriormente apresentada como Estação Acessível.

O nome **DUDA** é uma homenagem a **Maria Eduarda**, inspiração para uma proposta em que acessibilidade, participação, autonomia e aprendizagem façam parte da experiência desde o início.

Nesta etapa, a mudança é apenas de identidade e documentação. O endereço público permanece:

`https://estacao-acessivel.vercel.app`

## Arquitetura inicial

- Next.js com App Router e TypeScript
- Hospedagem na Vercel
- Supabase/PostgreSQL para autenticação, perfis e dados da plataforma
- Professor autenticado por e-mail institucional
- Estudante com código da atividade
- Biblioteca pública apenas com atividades aprovadas
- Painel administrativo restrito

## Princípios do produto

- O professor permanece responsável pela decisão pedagógica.
- A adaptação altera acesso, mediação e forma de resposta sem empobrecer o objetivo de aprendizagem.
- Diagnóstico ou laudo não deve aparecer na atividade compartilhada.
- O acesso do estudante será simplificado por código curto, QR Code ou link direto.
- As propostas devem poder existir em versão digital, impressa ou híbrida.

## Desenvolvimento

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` somente no computador de desenvolvimento e nunca envie segredos ao GitHub.

A documentação específica da nova identidade está em `docs/IDENTIDADE_DUDA.md`.
