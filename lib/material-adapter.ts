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

export type AdaptedQuestion = {
  index: number;
  prompt: string;
  type: "open_text" | "multiple_choice";
  options?: string[];
  source: "original" | "generated";
};

export type MaterialStructure = {
  materialType: "activity" | "study_material";
  headings: string[];
  instructions: string[];
  sourceQuestionCount: number;
};

export type MaterialAdaptationResult = {
  title: string;
  studentIntro: string;
  taskInstruction: string;
  blocks: AdaptedBlock[];
  questions: AdaptedQuestion[];
  structure: MaterialStructure;
  supportsApplied: string[];
  teacherGuidance: string[];
  aeeGuidance: string[];
  accessibilityNotes: string[];
};

const uniq = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const stopWords = new Set([
  "para","como","mais","uma","umas","uns","com","sem","que","por","dos","das","de","da","do","em","no","na","nos","nas",
  "se","ao","aos","as","os","um","e","o","a","é","são","ser","pode","podem","deve","devem","material","atividade","texto",
  "estudante","aluno","aluna","sobre","entre","também","muito","cada","esse","essa","isso","este","esta","seu","sua","suas","seus"
]);

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

function normalizeLine(line: string) {
  return line.replace(/^[-•▪◦]\s*/, "").replace(/^\d+[.)-]\s*/, "").trim();
}

function isOption(line: string) {
  return /^\s*[A-Ea-e][).:-]\s+/.test(line) || /^\s*\([A-Ea-e]\)\s+/.test(line);
}

function stripOption(line: string) {
  return line.replace(/^\s*(?:[A-Ea-e][).:-]|\([A-Ea-e]\))\s+/, "").trim();
}

function isQuestionLine(line: string) {
  const value = line.trim();
  if (!value) return false;
  if (value.endsWith("?")) return true;
  return /^\s*(?:quest[aã]o\s*)?\d+[.)-]\s+/i.test(value) &&
    /^(?:\s*(?:quest[aã]o\s*)?\d+[.)-]\s*)?(explique|responda|marque|escreva|complete|compare|relacione|identifique|observe|analise|escolha|registre|produza|indique|descreva)\b/i.test(value);
}

function isInstructionLine(line: string) {
  return /^(leia|observe|responda|faça|explique|marque|escreva|complete|analise|escolha|registre|produza|compare|relacione|identifique|indique|descreva)\b/i.test(normalizeLine(line));
}

function isHeading(line: string) {
  const value = line.trim();
  if (!value || value.length > 90 || value.endsWith("?")) return false;
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\s:–—-]{5,}$/.test(value)) return true;
  return /^(objetivo|tema|conteúdo|conteudo|atividade|situação|situacao|contexto|orientações|orientacoes|instruções|instrucoes|texto|leitura|desafio|tarefa)\s*[:—-]/i.test(value);
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

function extractKeywords(text: string, limit = 4) {
  const words = text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
  const counts = new Map<string, number>();
  for (const word of words) {
    if (word.length < 5 || stopWords.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([word])=>word);
}

function analyzeSource(text: string) {
  const lines = cleanText(text).split("\n").map((line)=>line.trim()).filter(Boolean);
  const headings: string[] = [];
  const instructions: string[] = [];
  const questions: AdaptedQuestion[] = [];
  const contentLines: string[] = [];

  for (let i=0;i<lines.length;i++) {
    const line = lines[i];
    if (isHeading(line)) {
      headings.push(line);
      continue;
    }
    if (isQuestionLine(line)) {
      const options: string[] = [];
      let j=i+1;
      while (j<lines.length && isOption(lines[j])) {
        options.push(stripOption(lines[j]));
        j++;
      }
      questions.push({
        index: questions.length+1,
        prompt: normalizeLine(line),
        type: options.length >= 2 ? "multiple_choice" : "open_text",
        ...(options.length >= 2 ? {options} : {}),
        source: "original"
      });
      i=j-1;
      continue;
    }
    if (isInstructionLine(line) && line.length <= 220) {
      instructions.push(normalizeLine(line));
      continue;
    }
    if (!isOption(line)) contentLines.push(line);
  }

  return {headings, instructions, questions, contentText: contentLines.join("\n\n")};
}

function generateQuestionsFromContent(text: string): AdaptedQuestion[] {
  const sentences = splitSentences(cleanText(text));
  const keywords = extractKeywords(text, 3);
  const main = keywords[0] || "tema principal";
  const second = keywords[1] || "conteúdo";
  const third = keywords[2] || "aprendizagem";

  const prompts = [
    "Explique com suas palavras a ideia principal do material sobre " + main + ".",
    "Qual relação você percebe entre " + main + " e " + second + "?",
    "Dê um exemplo ligado a " + third + " usando uma informação do material.",
    "Escreva uma frase dizendo o que você aprendeu e uma dúvida que ainda ficou."
  ];

  if (sentences.length) {
    const excerpt = sentences[0].slice(0,180) + (sentences[0].length>180 ? "…" : "");
    prompts[0] = "Leia esta ideia do material: “" + excerpt + "”. Explique com suas palavras o que ela significa.";
  }

  return prompts.map((prompt,index)=>({index:index+1,prompt,type:"open_text" as const,source:"generated" as const}));
}

function adaptPrompt(prompt: string, objectiveLanguage: boolean) {
  if (!objectiveLanguage) return prompt.trim();
  return prompt
    .replace(/analise/gi,"observe")
    .replace(/justifique/gi,"explique por quê")
    .replace(/discorra/gi,"explique")
    .replace(/elabore/gi,"escreva")
    .trim();
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

  const analyzed = analyzeSource(input.originalText);
  const sourceContent = analyzed.contentText || input.originalText;
  const maxSentences = oneAtATime ? 1 : cognitiveSupport ? 2 : 3;
  const maxChars = oneAtATime ? 220 : cognitiveSupport ? 320 : 520;
  const sourceChunks = chunkText(sourceContent, maxSentences, maxChars);

  const blocks = sourceChunks.map((text, index): AdaptedBlock => ({
    index: index + 1,
    text,
    kind: oneAtATime ? "step" : "content",
  }));

  const originalQuestions = analyzed.questions.map((question)=>({
    ...question,
    prompt: adaptPrompt(question.prompt, objectiveLanguage)
  }));
  const questions = originalQuestions.length ? originalQuestions : generateQuestionsFromContent(sourceContent);

  const supportsApplied = uniq([
    ...supports,
    ...(isBlind ? ["Leitura linear", "Descrição textual para elementos visuais essenciais", "Compatibilidade com leitor de tela"] : []),
    ...(isDeaf ? ["Informações essenciais em texto", "Apoio visual", ...(usesLibras ? ["Mediação em Libras"] : [])] : []),
    ...(isTEA ? ["Sequência previsível", "Uma etapa por vez", "Redução de ambiguidades"] : []),
    ...(isDown ? ["Blocos curtos", "Exemplos concretos", "Repetição e retomada"] : []),
  ]);

  const materialType = originalQuestions.length ? "activity" : "study_material";
  const taskInstruction = materialType === "activity"
    ? (analyzed.instructions[0] || "Leia o material e responda às questões.")
    : "Leia o material de apoio e responda às quatro questões para demonstrar o que compreendeu.";

  const teacherGuidance = [
    "Preserve o objetivo pedagógico do material original; a adaptação modifica o acesso, a organização e a forma de participação.",
    materialType === "activity"
      ? "O DUDA identificou " + originalQuestions.length + " questão(ões) no material original e as preservou na versão adaptada."
      : "O material não continha questões identificáveis. O DUDA criou quatro questões abertas de compreensão e aplicação a partir do conteúdo.",
    objectiveLanguage ? "Use frases diretas e confirme se o estudante compreendeu a ação solicitada antes de avançar." : "Permita releitura e esclarecimento de vocabulário quando necessário.",
    oneAtATime ? "Apresente um bloco ou uma questão por vez e avance somente após a compreensão do item atual." : "O material pode ser apresentado em blocos curtos mantendo a sequência original.",
    isBlind ? "Não use cor, posição ou imagem como única fonte de informação. Descreva qualquer elemento visual indispensável." : "",
    isDeaf ? "Não dependa de explicações exclusivamente orais. Mantenha instruções e informações-chave disponíveis por escrito." : "",
  ].filter(Boolean);

  const aeeGuidance = [
    input.autonomyLevel === "intensive"
      ? "Ofereça mediação frequente, com uma decisão por vez."
      : input.autonomyLevel === "autonomous"
        ? "Priorize tentativa autônoma e ofereça ajuda sob demanda."
        : "Ofereça pistas graduais e mediação quando houver necessidade.",
    input.responseModes.length
      ? "Aceite as formas de resposta selecionadas: " + input.responseModes.join(", ") + "."
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
      ? "Faça uma etapa por vez. Leia o material de apoio, responda e avance quando estiver pronto."
      : "Leia o material de apoio e responda às questões. Você pode reler cada parte quando precisar.",
    taskInstruction,
    blocks,
    questions,
    structure: {
      materialType,
      headings: analyzed.headings,
      instructions: analyzed.instructions,
      sourceQuestionCount: originalQuestions.length
    },
    supportsApplied,
    teacherGuidance,
    aeeGuidance,
    accessibilityNotes,
  };
}
