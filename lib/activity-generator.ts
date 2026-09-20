import { personalizeAndValidate, type PersonalizationCheck } from "./personalization-engine.ts";

export type GeneratedQuestion = {
  position: number; prompt: string;
  question_type: "open_text" | "multiple_choice" | "true_false" | "instruction";
  options?: string[]; correct_answer?: string | boolean | null;
  accessibility_support?: string | null; points?: number;
  media_url?: string | null; media_alt?: string | null; media_caption?: string | null;
};
export type GeneratedActivity = { title: string; learningObjective: string; description: string; instructions: string[]; supportsApplied: string[]; responseGuidance: string[]; teacherNotes: string[]; assessment: string[]; questions: GeneratedQuestion[]; personalizationSignature: string; personalizationRules: string[]; validationChecks: PersonalizationCheck[]; generationApproved: boolean; sourceUnit?: GeneratorInput["sourceUnit"] };
export type GeneratorInput = { component: string; schoolYear: string; term: string; theme: string; curriculumObjective?: string | null; learnerProfiles: string[]; accessBarriers: string[]; supportNeeds: string[]; communicationModes: string[]; autonomyLevel: string; responseModes: string[]; sourceUnit?: { materialKey: string; sourceName: string; teacherMaterials: Array<{label:string;url:string}>; studentMaterials: Array<{label:string;url:string}>; domain: string; pedagogicalFocus: string; learningObjectives: string[]; coreConcepts: string[]; authenticContexts: string[]; activityPatterns: string[]; assessmentEvidence: string[]; misconceptionAlerts: string[]; fidelityStatus: "extracted" | "reviewed" } | null };

const profileSupportMap: Record<string, string[]> = {
  TEA: ["linguagem direta e literal", "rotina previsível", "uma ação por etapa", "redução de ambiguidades"],
  "Síndrome de Down": ["exemplos concretos", "instruções curtas", "repetição funcional", "apoio visual"],
  "Deficiência intelectual": ["redução de carga cognitiva", "uma etapa por vez", "pistas graduais", "modelo resolvido"],
  Cegueira: ["descrição textual completa", "compatibilidade com leitor de tela", "nenhuma informação apenas visual"],
  "Baixa visão": ["alto contraste", "ampliação", "organização visual limpa"],
  Surdez: ["instruções escritas", "apoio visual", "Libras quando utilizada pelo estudante", "nenhuma informação apenas oral"],
  "Deficiência auditiva": ["instruções escritas", "apoio visual", "clareza na comunicação"],
  Surdocegueira: ["mediação individualizada", "comunicação acessível", "instruções segmentadas"],
  "Deficiência física": ["alternativas de resposta", "baixa exigência motora fina", "tecnologia assistiva"],
  "Deficiência múltipla": ["apoios combinados", "mediação ampliada", "progressão em pequenas etapas"],
  "Altas habilidades / superdotação": ["desafio de aprofundamento", "possibilidade de escolhas", "problema aberto"],
  "TDAH / atenção e autorregulação": ["blocos curtos", "objetivo visível", "redução de distrações", "feedback imediato"],
  "Transtorno específico de aprendizagem": ["instruções objetivas", "tempo ampliado", "modelo resolvido", "alternativas de resposta"],
};
const autonomyMap: Record<string, string> = { intensive: "Confirmar a compreensão após cada etapa e oferecer mediação frequente.", moderate: "Oferecer pistas graduais e permitir execução parcialmente autônoma.", autonomous: "Priorizar escolhas e desafio de extensão, mantendo apoio disponível." };
function uniq(values: string[]) { return Array.from(new Set(values.filter(Boolean))); }
function has(input: GeneratorInput, value: string) { return input.learnerProfiles.includes(value) || input.supportNeeds.includes(value); }
function questionSupport(input: GeneratorInput) {
  const parts: string[] = [];
  if (has(input, "TEA") || has(input, "Linguagem objetiva")) parts.push("linguagem literal e objetiva");
  if (has(input, "Surdez") || has(input, "Deficiência auditiva")) parts.push("instrução escrita e visual; não depender de áudio");
  if (has(input, "Libras")) parts.push("permitir mediação em Libras");
  if (has(input, "Uma etapa por vez")) parts.push("apresentar uma etapa por vez");
  if (has(input, "Redução de carga cognitiva")) parts.push("destacar somente as informações essenciais");
  if (has(input, "Cegueira")) parts.push("descrever todo elemento visual em texto");
  return uniq(parts).join("; ") || "instrução objetiva e possibilidade de releitura";
}

function knowledge(input: GeneratorInput) {
  const unit = input.sourceUnit;
  if (!unit) throw new Error("A geração automática exige uma unidade pedagógica indexada.");
  return {
    focus: unit.pedagogicalFocus,
    objective: unit.learningObjectives[0] || input.curriculumObjective || `Aplicar conhecimentos de ${input.theme}.`,
    concepts: unit.coreConcepts.slice(0, 5),
    context: unit.authenticContexts[0] || "situação autêntica de aprendizagem",
    pattern: unit.activityPatterns[0] || "analisar, decidir e justificar",
    assessment: unit.assessmentEvidence,
  };
}

type MediaDescriptor = Pick<GeneratedQuestion, "media_url" | "media_alt" | "media_caption">;

const mediaByDomain: Record<string, MediaDescriptor> = {
  media: { media_url: "/activity-media/verificar-informacao.svg", media_alt: "Informação sendo analisada e comparada com uma fonte verificável", media_caption: "Observe as evidências antes de tomar uma decisão." },
  digital_citizenship: { media_url: "/activity-media/seguranca-digital.svg", media_alt: "Escudo representando proteção e uso responsável de recursos digitais", media_caption: "Reconheça riscos, responsabilidades e atitudes seguras." },
  data: { media_url: "/activity-media/leitura-dados.svg", media_alt: "Dados organizados em tabela e representação gráfica", media_caption: "Compare os dados e registre a evidência encontrada." },
  digital_tools: { media_url: "/activity-media/comunicacao-acessivel.svg", media_alt: "Produto digital organizado com título, imagem, texto e ação", media_caption: "Verifique se a organização facilita o uso e a compreensão." },
  robotics: { media_url: "/activity-media/robo-sensor.svg", media_alt: "Sistema robótico relacionando entrada, processamento e ação", media_caption: "Identifique como cada elemento participa do funcionamento do sistema." },
  programming: { media_url: "/activity-media/fluxo-algoritmo.svg", media_alt: "Fluxo de solução organizado em entrada, processamento, decisão e saída", media_caption: "Organize a solução em etapas que possam ser verificadas." },
  computational_thinking: { media_url: "/activity-media/fluxo-algoritmo.svg", media_alt: "Fluxo de solução organizado em entrada, processamento, decisão e saída", media_caption: "Organize a solução em etapas que possam ser verificadas." },
};

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[.;:]$/, "");
}

function first(values: string[], fallback: string) {
  return compact(values.find((value) => value.trim()) ?? fallback);
}

function depthFor(schoolYear: string) {
  if (/ensino médio|série em|ª série/i.test(schoolYear)) return { action: "compare, avalie e justifique", evidence: "argumento fundamentado e teste ou evidência verificável" };
  if (/8º|9º/.test(schoolYear)) return { action: "analise, aplique e justifique", evidence: "decisão justificada com evidência" };
  return { action: "identifique, aplique e explique", evidence: "registro claro da estratégia e do resultado" };
}

function sourceDrivenQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const unit = knowledge(input);
  const source = input.sourceUnit!;
  const support = questionSupport(input);
  const depth = depthFor(input.schoolYear);
  const concepts = source.coreConcepts.map(compact).filter(Boolean);
  const primaryConcept = concepts[0] ?? compact(input.theme);
  const secondaryConcept = concepts[1] ?? primaryConcept;
  const context = first(source.authenticContexts, `uma situação real relacionada a ${input.theme}`);
  const pattern = first(source.activityPatterns, depth.action);
  const evidence = first(source.assessmentEvidence, depth.evidence);
  const misconception = first(source.misconceptionAlerts, `resolver sem relacionar ${primaryConcept} ao objetivo proposto`);
  const media = mediaByDomain[source.domain] ?? {};
  const correctStrategy = `Usar ${pattern} e relacionar ${primaryConcept} ao objetivo da unidade`;
  const correctEvidence = `Apresentar ${evidence}`;

  return [
    {
      position: 1,
      question_type: "instruction",
      prompt: `SITUAÇÃO — Considere ${context}. Nesta atividade, você deverá ${depth.action} conhecimentos de ${primaryConcept}${secondaryConcept !== primaryConcept ? ` e ${secondaryConcept}` : ""} para alcançar o objetivo: ${unit.objective}`,
      correct_answer: null,
      accessibility_support: `${support}; destacar contexto, conceitos e objetivo em blocos separados`,
      points: 0,
      ...media,
    },
    {
      position: 2,
      question_type: "multiple_choice",
      prompt: `Qual estratégia está mais alinhada à proposta da unidade “${input.theme}”?`,
      options: [
        correctStrategy,
        `Decidir sem considerar ${primaryConcept} nem o contexto apresentado`,
        `Copiar uma resposta pronta sem aplicar ${pattern}`,
        `Ignorar o objetivo e registrar apenas uma opinião sem evidência`,
      ],
      correct_answer: correctStrategy,
      accessibility_support: support,
      points: 1,
    },
    {
      position: 3,
      question_type: "multiple_choice",
      prompt: "Qual produção demonstra melhor que o objetivo de aprendizagem foi alcançado?",
      options: [
        correctEvidence,
        `Repetir palavras sobre ${primaryConcept} sem explicar a relação com a situação`,
        "Apresentar uma resposta sem procedimento, justificativa ou verificação",
        `Manter a ideia inicial mesmo quando ela apresenta este problema: ${misconception}`,
      ],
      correct_answer: correctEvidence,
      accessibility_support: support,
      points: 1,
    },
    {
      position: 4,
      question_type: "open_text",
      prompt: `Aplique a estratégia “${pattern}” à situação apresentada. Use ${primaryConcept}${secondaryConcept !== primaryConcept ? ` e ${secondaryConcept}` : ""} e produza ${evidence}.`,
      correct_answer: null,
      accessibility_support: `${support}; aceitar resposta organizada em etapas, palavras-chave ou modalidade escolhida pelo estudante`,
      points: 2,
    },
  ];
}

export function buildGeneratedActivity(input: GeneratorInput): GeneratedActivity {
  const unit = knowledge(input);
  const supportsApplied = uniq([...input.learnerProfiles.flatMap((profile) => profileSupportMap[profile] ?? []), ...input.supportNeeds]);
  const personalization = personalizeAndValidate({
    materialKey: input.sourceUnit?.materialKey ?? "manual",
    schoolYear: input.schoolYear,
    objective: unit.objective,
    learnerProfiles: input.learnerProfiles,
    accessBarriers: input.accessBarriers,
    supportNeeds: input.supportNeeds,
    communicationModes: input.communicationModes,
    autonomyLevel: input.autonomyLevel,
    responseModes: input.responseModes,
  }, sourceDrivenQuestions(input));

  if (!personalization.approved) {
    const failed = personalization.checks.filter((check) => !check.passed).map((check) => check.detail).join(" ");
    throw new Error(`A atividade não atingiu os critérios de personalização: ${failed}`);
  }

  return {
    title: `${input.theme} — atividade aplicada`,
    learningObjective: unit.objective,
    description: `${unit.focus} Proposta destinada ao ${input.schoolYear}, ${input.term}, construída a partir da unidade oficial “${input.theme}”.`,
    instructions: [`Contextualizar por meio de ${unit.context}.`, ...input.sourceUnit!.activityPatterns.slice(0, 3).map((pattern) => `Conduzir o estudante a ${pattern}.`), "Confirmar a compreensão sem fornecer a resposta."],
    supportsApplied,
    responseGuidance: input.responseModes.length ? input.responseModes.map((mode) => `permitir resposta por ${mode.toLowerCase()}`) : ["permitir resposta por seleção ou texto curto"],
    teacherNotes: ["O perfil orienta o acesso e não aparece para o estudante.", "O objetivo curricular é preservado; mudam linguagem, mediação e forma de resposta.", autonomyMap[input.autonomyLevel] ?? autonomyMap.moderate, input.sourceUnit ? `Referência: ${input.sourceUnit.sourceName} — ${input.theme}.` : "Atividade sem unidade oficial vinculada; revisar antes de publicar."],
    assessment: unit.assessment.length ? unit.assessment : ["Compreende a situação-problema.", "Comunica a resposta pela modalidade escolhida."],
    questions: personalization.questions,
    personalizationSignature: personalization.signature,
    personalizationRules: personalization.rulesApplied,
    validationChecks: personalization.checks,
    generationApproved: personalization.approved,
    ...(input.sourceUnit ? { sourceUnit: input.sourceUnit } : {}),
  };
}
