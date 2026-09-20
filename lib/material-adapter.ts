export type MaterialAdaptationInput = {
  title: string;
  originalText: string;
  learnerProfiles: string[];
  supportNeeds: string[];
  communicationModes: string[];
  autonomyLevel: string;
  responseModes: string[];
};

export type AdaptedBlock = {
  index: number;
  text: string;
  kind: "content" | "step" | "attention";
};

export type MaterialAdaptationResult = {
  title: string;
  studentIntro: string;
  blocks: AdaptedBlock[];
  supportsApplied: string[];
  teacherGuidance: string[];
  aeeGuidance: string[];
  accessibilityNotes: string[];
};

const uniq = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

function includesAny(values: string[], patterns: RegExp[]) {
  return values.some((value) => patterns.some((pattern) => pattern.test(value)));
}

function cleanText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function chunkText(text: string, maxSentences: number, maxChars: number) {
  const paragraphs = cleanText(text).split(/\n\n+/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    const sentences = splitSentences(paragraph);
    if (sentences.length <= maxSentences && paragraph.length <= maxChars) {
      chunks.push(paragraph);
      continue;
    }

    let current: string[] = [];
    let size = 0;
    for (const sentence of sentences) {
      const nextSize = size + sentence.length + 1;
      if (current.length >= maxSentences || (current.length && nextSize > maxChars)) {
        chunks.push(current.join(" "));
        current = [];
        size = 0;
      }
      current.push(sentence);
      size += sentence.length + 1;
    }
    if (current.length) chunks.push(current.join(" "));
  }

  return chunks;
}

export function adaptExistingMaterial(input: MaterialAdaptationInput): MaterialAdaptationResult {
  const profiles = input.learnerProfiles;
  const supports = input.supportNeeds;
  const combined = [...profiles, ...supports, ...input.communicationModes];

  const isBlind = includesAny(profiles, [/Cegueira/i]);
  const isDeaf = includesAny(profiles, [/Surdez/i, /Deficiência auditiva/i]);
  const isTEA = includesAny(profiles, [/TEA/i]);
  const isDown = includesAny(profiles, [/Síndrome de Down/i]);
  const cognitiveSupport = isDown || includesAny(profiles, [/Deficiência intelectual/i]) || includesAny(supports, [/Redução de carga cognitiva/i]);
  const oneAtATime = isTEA || cognitiveSupport || includesAny(supports, [/Uma etapa por vez/i]);
  const objectiveLanguage = isTEA || cognitiveSupport || includesAny(supports, [/Linguagem objetiva/i]);
  const lowStimulus = isTEA || includesAny(supports, [/Menos estímulos visuais/i]);
  const usesLibras = includesAny(combined, [/Libras/i]);

  const maxSentences = oneAtATime ? 1 : cognitiveSupport ? 2 : 3;
  const maxChars = oneAtATime ? 220 : cognitiveSupport ? 320 : 520;
  const sourceChunks = chunkText(input.originalText, maxSentences, maxChars);

  const blocks = sourceChunks.map((text, index): AdaptedBlock => ({
    index: index + 1,
    text,
    kind: oneAtATime ? "step" : "content",
  }));

  const supportsApplied = uniq([
    ...supports,
    ...(isBlind ? ["Leitura linear", "Descrição textual para elementos visuais essenciais", "Compatibilidade com leitor de tela"] : []),
    ...(isDeaf ? ["Informações essenciais em texto", "Apoio visual", ...(usesLibras ? ["Mediação em Libras"] : [])] : []),
    ...(isTEA ? ["Sequência previsível", "Uma etapa por vez", "Redução de ambiguidades"] : []),
    ...(isDown ? ["Blocos curtos", "Exemplos concretos", "Repetição e retomada"] : []),
  ]);

  const teacherGuidance = [
    "Preserve o objetivo pedagógico do material original; a adaptação modifica o acesso, a organização e a forma de participação.",
    objectiveLanguage ? "Use frases diretas e confirme se o estudante compreendeu a ação solicitada antes de avançar." : "Permita releitura e esclarecimento de vocabulário quando necessário.",
    oneAtATime ? "Apresente um bloco por vez e avance somente após a compreensão do bloco atual." : "O material pode ser apresentado em blocos curtos mantendo a sequência original.",
    isBlind ? "Não use cor, posição ou imagem como única fonte de informação. Descreva verbalmente ou em texto qualquer elemento visual indispensável." : "",
    isDeaf ? "Não dependa de explicações exclusivamente orais. Mantenha instruções e informações-chave disponíveis por escrito." : "",
  ].filter(Boolean);

  const aeeGuidance = [
    input.autonomyLevel === "intensive"
      ? "Ofereça mediação frequente, com uma decisão por vez."
      : input.autonomyLevel === "autonomous"
        ? "Priorize tentativa autônoma e ofereça ajuda sob demanda."
        : "Ofereça pistas graduais e mediação quando houver necessidade.",
    input.responseModes.length
      ? `Aceite as formas de resposta selecionadas: ${input.responseModes.join(", ")}.`
      : "Aceite resposta oral, por seleção ou texto curto quando compatível com o objetivo.",
    isDown ? "Retome palavras-chave e exemplos concretos antes de pedir uma resposta independente." : "",
    isTEA ? "Antecipe a sequência da tarefa e evite mudanças desnecessárias durante a execução." : "",
    isBlind ? "Garanta ordem de leitura lógica e identificação textual de tabelas, gráficos e imagens essenciais." : "",
    isDeaf && usesLibras ? "Quando previsto para o estudante, permita mediação em Libras sem substituir a exigência conceitual da atividade." : "",
  ].filter(Boolean);

  const accessibilityNotes = [
    lowStimulus ? "Exibir somente o conteúdo necessário em cada etapa." : "Manter organização visual estável.",
    isBlind ? "A versão do estudante deve continuar utilizável sem enxergar as imagens." : "",
    isDeaf ? "Áudio pode ser complementar, nunca obrigatório para compreender o material." : "",
    objectiveLanguage ? "Evitar metáforas, ironias e instruções vagas quando elas não forem objeto de aprendizagem." : "",
  ].filter(Boolean);

  return {
    title: input.title.trim() || "Material adaptado",
    studentIntro: oneAtATime
      ? "Leia uma parte por vez. Quando terminar, siga para a próxima."
      : "Leia o material em blocos. Você pode reler cada parte quando precisar.",
    blocks,
    supportsApplied,
    teacherGuidance,
    aeeGuidance,
    accessibilityNotes,
  };
}
