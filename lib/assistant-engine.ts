export type AssistantMode = "activity" | "adaptation" | "objective";

export type CurriculumAssistantItem = {
  id: string;
  component: string;
  school_year: string;
  term: string;
  theme: string | null;
  learning_objective: string | null;
  contents: string | null;
  skill_text: string | null;
  knowledge_object: string | null;
  project_delivery: string | null;
};

export type AccessibilityAssistantStrategy = {
  profile: string;
  access_barriers: string[];
  presentation_supports: string[];
  action_expression_supports: string[];
  engagement_supports: string[];
  validation_notes: string | null;
};

export type AssistantSuggestion = {
  title: string;
  objective: string;
  summary: string;
  steps: string[];
  evidence: string[];
  accessibility: string[];
};

function clean(value: string | null | undefined, fallback = "") {
  return (value ?? fallback).replace(/\s+/g, " ").trim();
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.map((value) => clean(value)).find(Boolean) ?? "";
}

export function buildAssistantSuggestion(
  mode: AssistantMode,
  item: CurriculumAssistantItem,
  strategy?: AccessibilityAssistantStrategy | null,
): AssistantSuggestion {
  const theme = clean(item.theme, "tema selecionado");
  const objective = firstNonEmpty(item.learning_objective, item.skill_text, `Compreender e aplicar conhecimentos relacionados a ${theme}.`);
  const knowledge = firstNonEmpty(item.knowledge_object, item.contents, theme);
  const delivery = firstNonEmpty(item.project_delivery, "Produzir um registro curto que demonstre o que foi aprendido.");
  const supports = strategy
    ? [
        ...strategy.presentation_supports.slice(0, 3),
        ...strategy.action_expression_supports.slice(0, 2),
        ...strategy.engagement_supports.slice(0, 2),
      ]
    : [];

  if (mode === "adaptation") {
    return {
      title: `Adaptação sugerida — ${theme}`,
      objective,
      summary: strategy
        ? `Manter o objetivo curricular e reduzir barreiras de acesso para o perfil ${strategy.profile}.`
        : "Manter o objetivo curricular e ajustar apresentação, participação e forma de resposta.",
      steps: strategy
        ? [
            `Apresente o conteúdo com: ${strategy.presentation_supports.slice(0, 3).join("; ") || "linguagem objetiva e organização visual clara"}.`,
            `Permita resposta por: ${strategy.action_expression_supports.slice(0, 3).join("; ") || "seleção, resposta curta ou mediação"}.`,
            `Sustente o engajamento com: ${strategy.engagement_supports.slice(0, 3).join("; ") || "objetivo visível e etapas curtas"}.`,
            `Preserve o conteúdo central: ${knowledge}.`,
          ]
        : [
            "Divida a proposta em etapas curtas e numeradas.",
            "Destaque somente as informações essenciais.",
            "Ofereça mais de uma forma de resposta sem reduzir o objetivo curricular.",
            `Preserve o conteúdo central: ${knowledge}.`,
          ],
      evidence: [
        "O estudante compreende o que deve fazer em cada etapa.",
        "A resposta demonstra o objetivo curricular, mesmo em formato alternativo.",
        delivery,
      ],
      accessibility: supports,
    };
  }

  if (mode === "objective") {
    return {
      title: `Objetivo e evidências — ${theme}`,
      objective,
      summary: `Foco curricular: ${knowledge}.`,
      steps: [
        "Apresente o objetivo em linguagem clara no início da aula.",
        "Proponha uma situação prática relacionada ao tema.",
        "Peça ao estudante que explique, selecione, organize ou produza uma resposta que evidencie o conceito.",
        "Retome o objetivo no fechamento e verifique o que foi demonstrado.",
      ],
      evidence: [
        `Consegue explicar ou aplicar: ${knowledge}.`,
        "Usa evidências da atividade para justificar a resposta.",
        delivery,
      ],
      accessibility: supports,
    };
  }

  return {
    title: `Sugestão de atividade — ${theme}`,
    objective,
    summary: `Proposta alinhada ao componente ${item.component}, ${item.school_year}, ${item.term}.`,
    steps: [
      `1. Situação inicial: apresente um exemplo cotidiano relacionado a ${theme}.`,
      `2. Exploração: destaque o conceito central — ${knowledge}.`,
      "3. Aplicação: peça ao estudante para resolver ou explicar uma situação usando o conceito.",
      "4. Fechamento: peça uma justificativa curta ou uma escolha comentada.",
    ],
    evidence: [
      "Questão 1: identificar o conceito principal da situação apresentada.",
      "Questão 2: relacionar o conceito a um exemplo prático.",
      "Questão 3: aplicar o conhecimento em uma situação-problema.",
      "Questão 4: justificar a resposta ou explicar o procedimento utilizado.",
      delivery,
    ],
    accessibility: supports,
  };
}
