# Estação Acessível

Portal de atividades acessíveis de Tecnologia, Programação e Robótica para a rede pública estadual de São Paulo.

## Arquitetura inicial

- Next.js com App Router e TypeScript
- Hospedagem prevista na Vercel
- PostgreSQL para dados curriculares, atividades, códigos e revisões
- Professor autenticado por e-mail institucional e código temporário
- Estudante com código da atividade
- Biblioteca pública apenas com atividades aprovadas
- Painel administrativo restrito

## Desenvolvimento

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` somente no computador de desenvolvimento e nunca envie segredos ao GitHub.
