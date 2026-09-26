export type AdaptableQuestion = {
  position: number;
  prompt: string;
  question_type: "open_text" | "multiple_choice" | "true_false" | "instruction";
  options?: string[];
  correct_answer?: string | boolean | null;
  accessibility_support?: string | null;
  points?: number;
  media_url?: string | null;
  media_alt?: string | null;
  media_caption?: string | null;
};

export type PersonalizationInput = {
  materialKey: string;
  schoolYear: string;
  objective: string;
  learnerProfiles: string[];
  accessBarriers: string[];
  supportNeeds: string[];
  communicationModes: string[];
  autonomyLevel: string;
  responseModes: string[];
};

export type PersonalizationCheck = {
  key: string;
  passed: boolean;
  detail: string;
};

export type PersonalizationResult<T extends AdaptableQuestion> = {
  signature: string;
  rulesApplied: string[];
  questions: T[];
  checks: PersonalizationCheck[];
  approved: boolean;
};

const normalized = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
const includes = (input: PersonalizationInput, pattern: RegExp) => [...input.learnerProfiles, ...input.accessBarriers, ...input.supportNeeds, ...input.communicationModes].some((value) => pattern.test(value));

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function createPersonalizationSignature(input: PersonalizationInput) {
  const canonical = JSON.stringify({
    version: "duda-personalization-v1",
    materialKey: input.materialKey,
    schoolYear: input.schoolYear,
    objective: input.objective.trim(),
    learnerProfiles: normalized(input.learnerProfiles),
    accessBarriers: normalized(input.accessBarriers),
    supportNeeds: normalized(input.supportNeeds),
    communicationModes: normalized(input.communicationModes),
    autonomyLevel: input.autonomyLevel,
    responseModes: normalized(input.responseModes),
  });
  return `duda-v1-${stableHash(canonical)}`;
}

function rulesFor(input: PersonalizationInput) {
  const rules: string[] = [];
  if (includes(input, /TEA|Linguagem objetiva|Rotina previsível/i)) rules.push("linguagem_literal", "previsibilidade", "etapas_explicitas");
  if (includes(input, /Surdez|Deficiência auditiva|Libras/i)) rules.push("informacao_visual_escrita", "nao_depender_audio", "resposta_libras_mediada");
  if (includes(input, /Cegueira|Descrição textual/i)) rules.push("equivalente_textual", "sem_pista_apenas_visual", "leitor_tela");
  if (includes(input, /Baixa visão|Alto contraste|ampliação/i)) rules.push("hierarquia_visual", "ampliacao", "baixo_ruido_visual");
  if (includes(input, /Deficiência intelectual|Síndrome de Down|carga cognitiva|Exemplos concretos/i)) rules.push("modelo_concreto", "segmentacao_cognitiva", "pistas_graduais");
  if (includes(input, /TDAH|Menos estímulos|Tempo ampliado/i)) rules.push("blocos_curtos", "meta_visivel", "retomada");
  if (includes(input, /Deficiência física|Tecnologia assistiva/i)) rules.push("baixa_exigencia_motora", "alternativa_teclado");
  if (includes(input, /Altas habilidades/i)) rules.push("aprofundamento", "problema_aberto");
  if (includes(input, /Comunicação alternativa/i)) rules.push("comunicacao_alternativa", "resposta_por_selecao");
  if (input.autonomyLevel === "intensive") rules.push("mediacao_frequente", "uma_decisao_por_etapa");
  if (input.autonomyLevel === "moderate") rules.push("pistas_sob_demanda");
  if (input.autonomyLevel === "autonomous") rules.push("escolha_autonoma", "extensao_opcional");
  if (input.responseModes.includes("Seleção")) rules.push("resposta_selecao");
  if (input.responseModes.includes("Texto")) rules.push("resposta_texto");
  return [...new Set(rules)];
}

function adaptPrompt(prompt: string, type: AdaptableQuestion["question_type"], rules: string[]) {
  let adapted = prompt.trim();
  if (rules.includes("linguagem_literal")) {
    adapted = adapted
      .replace(/analise/gi, "observe")
      .replace(/justifique/gi, "explique")
      .replace(/investigue/gi, "verifique");
  }
  if (rules.includes("aprofundamento") && type === "open_text") {
    adapted += " Se conseguir, compare duas soluções e explique qual funciona melhor.";
  }
  return adapted;
}

function supportText(rules: string[], original?: string | null) {
  const supports: string[] = [];
  if (rules.includes("etapas_explicitas")) supports.push("sequência previsível e linguagem sem ambiguidade");
  if (rules.includes("informacao_visual_escrita")) supports.push("instrução escrita e apoio visual; áudio nunca é obrigatório");
  if (rules.includes("resposta_libras_mediada")) supports.push("aceitar registro mediado em Libras conforme preferência linguística");
  if (rules.includes("equivalente_textual")) supports.push("descrição funcional completa e navegação por leitor de tela");
  if (rules.includes("ampliacao")) supports.push("permitir ampliação sem perda de conteúdo");
  if (rules.includes("segmentacao_cognitiva")) supports.push("uma decisão por vez, exemplo concreto e pistas graduais");
  if (rules.includes("blocos_curtos")) supports.push("bloco curto, meta visível e possibilidade de retomada");
  if (rules.includes("baixa_exigencia_motora")) supports.push("resposta por teclado ou seleção sem precisão motora fina");
  if (rules.includes("comunicacao_alternativa")) supports.push("aceitar comunicação alternativa e resposta por seleção");
  if (rules.includes("mediacao_frequente")) supports.push("apresentar uma questão por vez e confirmar a compreensão antes de avançar");
  if (rules.includes("pistas_sob_demanda")) supports.push("oferecer pistas graduais somente quando houver necessidade");
  if (rules.includes("escolha_autonoma")) supports.push("priorizar tentativa autônoma e mediação apenas quando solicitada");
  if (rules.includes("resposta_selecao")) supports.push("permitir resposta por seleção");
  if (rules.includes("resposta_texto")) supports.push("permitir resposta por texto curto quando previsto na questão");
  return [...new Set([original?.trim(), ...supports].filter(Boolean) as string[])].join("; ");
}

function adaptQuestion<T extends AdaptableQuestion>(question: T, rules: string[]): T {
  const adapted = {
    ...question,
    prompt: adaptPrompt(question.prompt, question.question_type, rules),
    accessibility_support: supportText(rules, question.accessibility_support),
  };
  if (rules.includes("segmentacao_cognitiva") && adapted.question_type === "multiple_choice" && adapted.options && adapted.options.length > 3) {
    const correct = adapted.correct_answer;
    adapted.options = [adapted.options[0], ...adapted.options.slice(1).filter((option) => option === correct).slice(0, 1), ...adapted.options.slice(1).filter((option) => option !== correct).slice(0, 2)].slice(0, 3);
    if (typeof correct === "string" && !adapted.options.includes(correct)) adapted.options[adapted.options.length - 1] = correct;
  }
  if (rules.includes("sem_pista_apenas_visual") && adapted.media_url && !adapted.media_alt) adapted.media_url = null;
  return adapted as T;
}

function structuralFingerprint(questions: AdaptableQuestion[]) {
  return questions.map((question) => `${question.question_type}:${question.prompt.toLocaleLowerCase("pt-BR").replace(/[^a-zà-ú0-9]+/g, " ").trim()}:${question.options?.length ?? 0}`).join("|");
}

export function personalizeAndValidate<T extends AdaptableQuestion>(input: PersonalizationInput, baseQuestions: T[]): PersonalizationResult<T> {
  const rulesApplied = rulesFor(input);
  const signature = createPersonalizationSignature(input);
  const questions = baseQuestions.map((question) => adaptQuestion(question, rulesApplied));
  const baseFingerprint = structuralFingerprint(baseQuestions);
  const adaptedFingerprint = structuralFingerprint(questions);
  const structuralRules = new Set(["segmentacao_cognitiva", "aprofundamento"]);
  const requiresStructuralDifference = rulesApplied.some((rule) => structuralRules.has(rule));
  const checks: PersonalizationCheck[] = [
    { key: "official_objective", passed: Boolean(input.objective.trim()), detail: "Objetivo curricular preservado na solicitação." },
    { key: "personalization_rules", passed: rulesApplied.length > 0, detail: `${rulesApplied.length} regra(s) pedagógica(s) resolvida(s).` },
    { key: "question_supports", passed: questions.every((question) => Boolean(question.accessibility_support?.trim())), detail: "Todas as questões possuem apoio aplicável." },
    { key: "structural_difference", passed: !requiresStructuralDifference || baseFingerprint !== adaptedFingerprint, detail: requiresStructuralDifference && baseFingerprint === adaptedFingerprint ? "A personalização selecionada deveria alterar a estrutura das questões." : requiresStructuralDifference ? "A personalização alterou linguagem, etapas ou modalidade de participação." : "As escolhas atuais não exigem alteração estrutural dos enunciados." },
    { key: "privacy", passed: questions.every((question) => !input.learnerProfiles.some((profile) => question.prompt.includes(profile))), detail: "O diagnóstico não aparece para o estudante." },
  ];
  return { signature, rulesApplied, questions, checks, approved: checks.every((check) => check.passed) };
}
