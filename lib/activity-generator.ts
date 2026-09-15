export type GeneratedQuestion = {
  position: number;
  prompt: string;
  question_type: "open_text" | "multiple_choice" | "true_false" | "instruction";
  options?: string[];
  correct_answer?: string | boolean | null;
};

export type GeneratedActivity = {
  title: string;
  learningObjective: string;
  description: string;
  instructions: string[];
  supportsApplied: string[];
  responseGuidance: string[];
  teacherNotes: string[];
  assessment: string[];
  questions: GeneratedQuestion[];
};

const profileSupportMap: Record<string, string[]> = {
  "TEA": ["linguagem direta e literal", "rotina previsível", "organização por etapas", "redução de ambiguidades"],
  "Síndrome de Down": ["exemplos concretos", "instruções curtas", "repetição funcional", "apoio visual"],
  "Deficiência intelectual": ["redução de carga cognitiva", "uma etapa por vez", "exemplos concretos", "pistas graduais"],
  "Cegueira": ["descrição textual completa", "compatibilidade com leitor de tela", "eliminação de dependência exclusivamente visual"],
  "Baixa visão": ["alto contraste", "ampliação", "organização visual limpa"],
  "Surdez": ["instruções visuais e escritas", "possibilidade de Libras", "redução de dependência exclusivamente oral"],
  "Deficiência auditiva": ["instruções escritas", "apoio visual", "clareza na comunicação"],
  "Surdocegueira": ["mediação individualizada", "comunicação acessível", "instruções segmentadas"],
  "Deficiência física": ["alternativas de resposta", "redução de exigência motora fina", "compatibilidade com tecnologia assistiva"],
  "Deficiência múltipla": ["apoios combinados", "mediação ampliada", "progressão em pequenas etapas"],
  "Altas habilidades / superdotação": ["desafios de aprofundamento", "possibilidade de escolhas", "problemas abertos"],
  "TDAH / atenção e autorregulação": ["blocos curtos", "objetivo visível", "redução de distrações", "feedback imediato"],
  "Transtorno específico de aprendizagem": ["instruções objetivas", "mais tempo", "modelos resolvidos", "alternativas de resposta"],
};

const autonomyMap: Record<string, string> = {
  intensive: "ofereça apoio frequente do professor e confirme a compreensão a cada etapa",
  moderate: "ofereça pistas graduais e permita que o estudante conclua partes da tarefa com autonomia",
  autonomous: "priorize escolhas, autonomia e desafios de extensão, com apoio disponível quando necessário",
};

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function objectiveFor(theme: string, fallback?: string | null) {
  if (fallback) return fallback;
  const normalized = theme.toLowerCase();
  if (normalized.includes("algorit")) return "Compreender algoritmos como sequências estruturadas de instruções e aplicar raciocínio lógico na resolução de problemas.";
  if (normalized.includes("condicion")) return "Usar decisões e condições para representar diferentes caminhos na resolução de problemas.";
  if (normalized.includes("repet")) return "Reconhecer padrões de repetição, testar soluções e revisar erros de forma sistemática.";
  if (normalized.includes("rob")) return "Planejar, testar e aperfeiçoar sequências de ações em uma solução de robótica ou automação.";
  if (normalized.includes("cultura digital")) return "Reconhecer práticas responsáveis, seguras e críticas no uso de tecnologias digitais.";
  return `Desenvolver compreensão significativa sobre ${theme}, aplicando o conhecimento em uma situação prática.`;
}

function baseQuestions(theme: string): GeneratedQuestion[] {
  return [
    {
      position: 1,
      question_type: "instruction",
      prompt: `Observe o desafio relacionado a ${theme}. Explique, com suas palavras ou pela forma de resposta escolhida, o que precisa ser resolvido.`,
      correct_answer: null,
    },
    {
      position: 2,
      question_type: "multiple_choice",
      prompt: "Qual estratégia ajuda mais a resolver o desafio passo a passo?",
      options: ["Organizar as etapas antes de começar", "Tentar tudo ao mesmo tempo", "Ignorar os testes", "Pular as instruções"],
      correct_answer: "Organizar as etapas antes de começar",
    },
    {
      position: 3,
      question_type: "open_text",
      prompt: "Depois de testar sua solução, registre uma melhoria que você faria e explique por quê.",
      correct_answer: null,
    },
  ];
}

export function buildGeneratedActivity(input: {
  component: string;
  schoolYear: string;
  term: string;
  theme: string;
  curriculumObjective?: string | null;
  learnerProfiles: string[];
  supportNeeds: string[];
  autonomyLevel: string;
  responseModes: string[];
}): GeneratedActivity {
  const profileSupports = input.learnerProfiles.flatMap((profile) => profileSupportMap[profile] ?? []);
  const supportsApplied = uniq([...profileSupports, ...input.supportNeeds]);
  const responseGuidance = input.responseModes.length
    ? input.responseModes.map((mode) => `permitir resposta por ${mode.toLowerCase()}`)
    : ["permitir resposta oral, escrita ou por seleção, conforme necessidade"];

  const titlePrefix = input.component === "Programação" ? "Missão Código" : input.component === "Robótica" ? "Desafio Maker" : "Conexão Digital";
  const title = `${titlePrefix}: ${input.theme}`;
  const learningObjective = objectiveFor(input.theme, input.curriculumObjective);

  const instructions = [
    "Apresente o objetivo da atividade em uma frase curta e confirme a compreensão antes de iniciar.",
    "Organize o desafio em pequenas etapas e permita que o estudante avance no próprio ritmo.",
    `Use uma situação prática do cotidiano para trabalhar ${input.theme}.`,
    "Faça uma pausa de checagem após a primeira tentativa e ofereça apenas o apoio necessário.",
  ];

  const teacherNotes = [
    "O perfil/condição informado é usado apenas para sugerir apoios pedagógicos; não deve aparecer na versão entregue ao estudante.",
    "Preserve o mesmo objetivo de aprendizagem para a turma, ajustando acesso, mediação e forma de resposta.",
    autonomyMap[input.autonomyLevel] ?? autonomyMap.moderate,
  ];

  const assessment = [
    "Identifica o que o desafio solicita.",
    "Organiza uma estratégia ou sequência coerente.",
    "Testa, revisa e comunica uma melhoria possível.",
    "Demonstra compreensão do objetivo, mesmo utilizando apoios ou outra forma de resposta.",
  ];

  return {
    title,
    learningObjective,
    description: `Atividade autoral de ${input.component} para ${input.schoolYear}, ${input.term}, centrada em ${input.theme}. A proposta combina desafio prático, progressão em etapas e personalização de apoios sem reduzir o objetivo de aprendizagem.`,
    instructions,
    supportsApplied,
    responseGuidance,
    teacherNotes,
    assessment,
    questions: baseQuestions(input.theme),
  };
}
