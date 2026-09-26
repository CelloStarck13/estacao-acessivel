import { personalizeAndValidate, type PersonalizationCheck } from "./personalization-engine.ts";

export type GeneratedQuestion = {
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

export type SourceUnit = {
  materialKey: string;
  sourceName: string;
  teacherMaterials: Array<{ label: string; url: string }>;
  studentMaterials: Array<{ label: string; url: string }>;
  domain: string;
  pedagogicalFocus: string;
  learningObjectives: string[];
  coreConcepts: string[];
  authenticContexts: string[];
  activityPatterns: string[];
  assessmentEvidence: string[];
  misconceptionAlerts: string[];
  fidelityStatus: "extracted" | "reviewed";
};

export type GeneratedActivity = {
  title: string;
  learningObjective: string;
  description: string;
  instructions: string[];
  supportsApplied: string[];
  responseGuidance: string[];
  teacherNotes: string[];
  teacherGuidance: string[];
  aeeGuidance: string[];
  assessment: string[];
  questions: GeneratedQuestion[];
  personalizationSignature: string;
  personalizationRules: string[];
  validationChecks: PersonalizationCheck[];
  generationApproved: boolean;
  curriculumFamily: string;
  sourceUnit?: SourceUnit | null;
};

export type GeneratorInput = {
  component: string;
  schoolYear: string;
  term: string;
  theme: string;
  curriculumObjective?: string | null;
  learnerProfiles: string[];
  accessBarriers: string[];
  supportNeeds: string[];
  communicationModes: string[];
  autonomyLevel: string;
  responseModes: string[];
  sourceUnit?: SourceUnit | null;
};

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

const autonomyMap: Record<string, string> = {
  intensive: "Apresente uma questão por vez e confirme a compreensão antes de avançar.",
  moderate: "Ofereça pistas graduais somente quando houver necessidade.",
  autonomous: "Priorize a tentativa autônoma e use a mediação apenas quando solicitada.",
};

const stopWords = new Set([
  "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "com", "para", "por", "um", "uma", "que", "como",
  "ao", "na", "no", "nas", "nos", "se", "sua", "seu", "suas", "seus", "mais", "parte", "atividade", "aplicada", "unidade",
]);

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

function relevance(value: string, reference: string) {
  const candidate = normalizeText(value);
  const refs = tokens(reference);
  return refs.reduce((score, token) => score + (candidate.includes(token.slice(0, Math.max(4, token.length - 2))) ? 1 : 0), 0);
}

function best(values: string[], reference: string, fallback: string) {
  const available = values.map((value) => value.trim()).filter(Boolean);
  if (!available.length) return fallback;
  return [...available].sort((a, b) => relevance(b, reference) - relevance(a, reference))[0];
}

function ranked(values: string[], reference: string, limit: number) {
  return [...values]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => relevance(b, reference) - relevance(a, reference))
    .slice(0, limit);
}

function has(input: GeneratorInput, value: string) {
  return input.learnerProfiles.includes(value) || input.supportNeeds.includes(value);
}

function questionSupport(input: GeneratorInput) {
  const parts: string[] = [];
  if (has(input, "TEA") || has(input, "Linguagem objetiva")) parts.push("linguagem literal e objetiva");
  if (has(input, "Surdez") || has(input, "Deficiência auditiva")) parts.push("instrução escrita e visual; não depender de áudio");
  if (has(input, "Libras")) parts.push("permitir mediação em Libras");
  if (has(input, "Uma etapa por vez")) parts.push("apresentar uma etapa por vez");
  if (has(input, "Redução de carga cognitiva")) parts.push("destacar somente as informações essenciais");
  if (has(input, "Cegueira")) parts.push("descrever todo elemento visual em texto");
  if (has(input, "Tempo ampliado")) parts.push("permitir tempo ampliado");
  if (has(input, "Tecnologia assistiva")) parts.push("permitir tecnologia assistiva");
  return uniq(parts).join("; ") || "instrução objetiva e possibilidade de releitura";
}

function knowledge(input: GeneratorInput) {
  const unit = input.sourceUnit;
  if (!unit) throw new Error("A geração automática exige uma unidade pedagógica indexada.");

  const reference = `${input.theme} ${unit.pedagogicalFocus}`;
  const concepts = ranked(unit.coreConcepts, input.theme, 6);
  const objective = best(
    unit.learningObjectives,
    `${input.theme} ${concepts.join(" ")}`,
    input.curriculumObjective || `Aplicar conhecimentos de ${input.theme}.`,
  );
  const context = best(unit.authenticContexts, `${input.theme} ${concepts.join(" ")}`, `uma situação relacionada a ${input.theme}`);
  const pattern = best(unit.activityPatterns, `${input.theme} ${concepts.join(" ")}`, "analisar e aplicar a estratégia da unidade");
  const assessment = ranked(unit.assessmentEvidence, `${input.theme} ${objective}`, 4);

  return {
    focus: unit.pedagogicalFocus.trim(),
    objective,
    concepts,
    context,
    pattern,
    assessment,
    reference,
  };
}

type Family =
  | "recommendation_algorithms"
  | "source_literacy"
  | "digital_safety"
  | "data_types"
  | "data_analysis"
  | "sorting_lists"
  | "python_functions_loops"
  | "programming"
  | "robotics"
  | "digital_tools"
  | "general";

function familyFor(input: GeneratorInput): Family {
  const text = normalizeText(`${input.theme} ${input.sourceUnit?.coreConcepts.join(" ") ?? ""}`);
  const domain = input.sourceUnit?.domain ?? "";

  if (domain === "media" && /(algorit|recomend|rede social|circulacao)/.test(text)) return "recommendation_algorithms";
  if (domain === "media") return "source_literacy";
  if (domain === "digital_citizenship") return "digital_safety";
  if (domain === "data" && /(tipo de dado|tipos de dados|colecao|maquina)/.test(text)) return "data_types";
  if (domain === "data") return "data_analysis";
  if (domain === "programming" && /(ordenacao|ordenar|lista)/.test(text)) return "sorting_lists";
  if (domain === "programming" && /(funcao|funcoes|loop|laco|repeticao)/.test(text)) return "python_functions_loops";
  if (domain === "programming" || domain === "computational_thinking") return "programming";
  if (domain === "robotics") return "robotics";
  if (domain === "digital_tools") return "digital_tools";
  return "general";
}

function mediaForFamily(family: Family) {
  switch (family) {
    case "recommendation_algorithms":
      return {
        media_url: "/activity-media/recomendacao-algoritmica.svg",
        media_alt: "Duas pessoas realizam interações diferentes e recebem recomendações diferentes na rede social",
        media_caption: "As interações registradas podem influenciar as recomendações mostradas a cada perfil.",
      };
    case "source_literacy":
      return {
        media_url: "/activity-media/verificar-informacao.svg",
        media_alt: "Uma mensagem sem autoria e fonte é comparada com informação confirmada em fonte oficial",
        media_caption: "Confira autoria, data, fonte e evidências antes de compartilhar.",
      };
    case "digital_safety":
      return {
        media_url: "/activity-media/seguranca-digital.svg",
        media_alt: "Mensagem de pessoa desconhecida pede senha e endereço enquanto um escudo representa proteção dos dados",
        media_caption: "Reconheça o risco e escolha uma atitude segura.",
      };
    case "data_types":
      return {
        media_url: "/activity-media/tipos-dados.svg",
        media_alt: "Cartões de uma coleção de máquinas mostram exemplos de dado em texto, número e imagem",
        media_caption: "Uma coleção pode reunir diferentes tipos de dados sobre cada item.",
      };
    case "data_analysis":
      return {
        media_url: "/activity-media/leitura-dados.svg",
        media_alt: "Tabela e gráfico representam os mesmos dados de formas diferentes",
        media_caption: "Compare os dados e use a representação para justificar sua conclusão.",
      };
    case "sorting_lists":
      return {
        media_url: "/activity-media/lista-ordenacao.svg",
        media_alt: "Uma lista numérica muda de 7, 3, 5 para 3, 7, 5 após comparar e trocar os dois primeiros valores",
        media_caption: "Algoritmos de ordenação comparam valores e podem trocar suas posições.",
      };
    case "python_functions_loops":
    case "programming":
      return {
        media_url: "/activity-media/fluxo-algoritmo.svg",
        media_alt: "Fluxo de algoritmo organizado em início, entrada, decisão e saída",
        media_caption: "Use etapas claras para compreender, testar e corrigir o programa.",
      };
    case "robotics":
      return {
        media_url: "/activity-media/robo-sensor.svg",
        media_alt: "Sistema robótico usa um sensor como entrada para decidir uma ação",
        media_caption: "Relacione entrada, processamento e ação do sistema.",
      };
    case "digital_tools":
      return {
        media_url: "/activity-media/comunicacao-acessivel.svg",
        media_alt: "Produto digital organizado com título, imagem, texto legível e ação",
        media_caption: "A organização do conteúdo ajuda a leitura e a compreensão.",
      };
    default:
      return {};
  }
}

function q(
  position: number,
  prompt: string,
  type: "open_text" | "multiple_choice" | "true_false",
  support: string,
  options?: string[],
  correct_answer?: string | boolean | null,
  points = 1,
  media: Partial<GeneratedQuestion> = {},
): GeneratedQuestion {
  return {
    position,
    prompt,
    question_type: type,
    ...(options ? { options } : {}),
    ...(correct_answer !== undefined ? { correct_answer } : {}),
    accessibility_support: support,
    points,
    ...media,
  };
}

function recommendationQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const media = mediaForFamily("recommendation_algorithms");
  return [
    q(
      1,
      "Ana costuma assistir e curtir vídeos de futebol. Bruno costuma assistir e curtir vídeos de música. Depois de alguns dias, a rede social mostra mais futebol para Ana e mais música para Bruno. O que melhor explica essa diferença?",
      "multiple_choice",
      support,
      [
        "A rede social usa sinais das interações de cada perfil para selecionar conteúdos que podem interessar a ele",
        "A rede social mostra exatamente o mesmo conteúdo para todas as pessoas",
        "As recomendações são escolhidas sem considerar nenhuma interação",
        "Somente o número de seguidores define todo o conteúdo do perfil",
      ],
      "A rede social usa sinais das interações de cada perfil para selecionar conteúdos que podem interessar a ele",
      1,
      media,
    ),
    q(
      2,
      "Qual conjunto de ações pode funcionar como sinal para um sistema de recomendação?",
      "multiple_choice",
      support,
      [
        "Vídeos assistidos, curtidas, cliques e tempo de visualização",
        "Somente a cor do aplicativo",
        "Apenas o nome do aparelho",
        "Somente a hora em que o celular foi comprado",
      ],
      "Vídeos assistidos, curtidas, cliques e tempo de visualização",
    ),
    q(
      3,
      "Qual cuidado é importante quando uma rede social passa a recomendar muitos conteúdos parecidos?",
      "multiple_choice",
      support,
      [
        "Buscar fontes e pontos de vista diferentes para não depender apenas do que o algoritmo recomenda",
        "Acreditar que tudo o que aparece primeiro é verdadeiro",
        "Compartilhar todo conteúdo recomendado sem verificar",
        "Considerar que uma recomendação representa a opinião de todas as pessoas",
      ],
      "Buscar fontes e pontos de vista diferentes para não depender apenas do que o algoritmo recomenda",
    ),
    q(
      4,
      "Explique, com uma ou duas frases, como uma ação do usuário pode influenciar uma recomendação da rede social. Dê um exemplo.",
      "open_text",
      `${support}; aceitar frase curta, palavras-chave ou resposta mediada`,
      undefined,
      null,
      2,
    ),
  ];
}

function sourceLiteracyQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const media = mediaForFamily("source_literacy");
  return [
    q(
      1,
      "Você recebeu uma publicação que pede para compartilhar imediatamente, mas não informa autor, data nem fonte. Qual deve ser sua primeira ação?",
      "multiple_choice",
      support,
      [
        "Procurar a fonte original e conferir autoria, data e evidências",
        "Compartilhar porque a mensagem parece urgente",
        "Confiar porque muitas pessoas já curtiram",
        "Repassar e verificar somente depois",
      ],
      "Procurar a fonte original e conferir autoria, data e evidências",
      1,
      media,
    ),
    q(
      2,
      "Qual conjunto apresenta sinais mais fortes de uma publicação verificável?",
      "multiple_choice",
      support,
      [
        "Autor identificado, data, fonte consultável e evidências",
        "Muitas curtidas, letras grandes e frase de impacto",
        "Mensagem anônima e sem data",
        "Imagem chamativa sem indicação de origem",
      ],
      "Autor identificado, data, fonte consultável e evidências",
    ),
    q(
      3,
      "Ao comparar duas publicações sobre o mesmo assunto, qual procedimento ajuda mais na checagem?",
      "multiple_choice",
      support,
      [
        "Comparar as fontes, a autoria, a data e as evidências apresentadas",
        "Escolher a publicação com mais compartilhamentos",
        "Usar somente a primeira publicação encontrada",
        "Ignorar informações que contradizem sua opinião",
      ],
      "Comparar as fontes, a autoria, a data e as evidências apresentadas",
    ),
    q(
      4,
      "Escreva uma justificativa curta dizendo se você compartilharia uma publicação sem fonte identificada e o que verificaria antes.",
      "open_text",
      `${support}; aceitar resposta curta, palavras-chave ou registro mediado`,
      undefined,
      null,
      2,
    ),
  ];
}

function digitalSafetyQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const media = mediaForFamily("digital_safety");
  return [
    q(
      1,
      "Uma pessoa desconhecida envia uma mensagem dizendo que você ganhou um prêmio e pede sua senha e seu endereço. Qual atitude é mais segura?",
      "multiple_choice",
      support,
      [
        "Não enviar os dados, interromper o contato e pedir ajuda a um adulto ou responsável",
        "Enviar somente a senha para testar",
        "Responder com o endereço e depois apagar a conversa",
        "Publicar a mensagem em um grupo com seus dados",
      ],
      "Não enviar os dados, interromper o contato e pedir ajuda a um adulto ou responsável",
      1,
      media,
    ),
    q(
      2,
      "Qual situação é um sinal de possível phishing ou engenharia social?",
      "multiple_choice",
      support,
      [
        "Mensagem urgente que pede senha, código ou clique em link desconhecido",
        "Aviso oficial acessado diretamente no site da instituição",
        "Atualização feita pela loja oficial do aplicativo",
        "Arquivo criado por você e salvo no seu dispositivo",
      ],
      "Mensagem urgente que pede senha, código ou clique em link desconhecido",
    ),
    q(
      3,
      "Qual prática ajuda a proteger uma conta online?",
      "multiple_choice",
      support,
      [
        "Usar senha forte, não compartilhar códigos e ativar verificação em duas etapas quando disponível",
        "Usar a mesma senha simples em todos os serviços",
        "Enviar sua senha a colegas de confiança",
        "Clicar em qualquer link que prometa prêmio",
      ],
      "Usar senha forte, não compartilhar códigos e ativar verificação em duas etapas quando disponível",
    ),
    q(
      4,
      "Explique uma ação segura que você recomendaria a alguém que recebeu uma mensagem suspeita pedindo dados pessoais.",
      "open_text",
      `${support}; aceitar frase curta, palavras-chave ou resposta mediada`,
      undefined,
      null,
      2,
    ),
  ];
}

function dataTypeQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const media = mediaForFamily("data_types");
  return [
    q(
      1,
      "Em uma coleção de máquinas, cada item possui nome, pontuação e imagem. Qual associação de tipos de dados está correta?",
      "multiple_choice",
      support,
      [
        "Nome = texto; pontuação = número; imagem = imagem",
        "Nome = número; pontuação = imagem; imagem = texto",
        "Nome = imagem; pontuação = texto; imagem = número",
        "Todos os campos precisam ser do mesmo tipo",
      ],
      "Nome = texto; pontuação = número; imagem = imagem",
      1,
      media,
    ),
    q(
      2,
      "Por que organizar várias máquinas em uma coleção ajuda o programa?",
      "multiple_choice",
      support,
      [
        "Porque permite guardar e acessar vários itens seguindo uma mesma organização",
        "Porque impede o programa de comparar informações",
        "Porque transforma todos os dados em imagem",
        "Porque elimina a necessidade de identificar cada item",
      ],
      "Porque permite guardar e acessar vários itens seguindo uma mesma organização",
    ),
    q(
      3,
      "Uma regra do jogo diz: se a pontuação da máquina for 7 ou mais, mostrar “classificada”. Qual elemento do programa toma essa decisão?",
      "multiple_choice",
      support,
      [
        "Uma condição que compara a pontuação com o valor 7",
        "Somente o nome da máquina",
        "A imagem da máquina sem nenhuma regra",
        "Uma frase fixa que nunca verifica a pontuação",
      ],
      "Uma condição que compara a pontuação com o valor 7",
    ),
    q(
      4,
      "Crie um exemplo de máquina para a coleção. Informe um nome, uma pontuação e explique qual tipo de dado representa cada informação.",
      "open_text",
      `${support}; aceitar resposta em tópicos, palavras-chave ou registro mediado`,
      undefined,
      null,
      2,
    ),
  ];
}

function dataAnalysisQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const unit = knowledge(input);
  const support = questionSupport(input);
  const media = mediaForFamily("data_analysis");
  return [
    q(
      1,
      `Considere ${unit.context}. Qual ação deve acontecer antes de tirar uma conclusão sobre os dados?`,
      "multiple_choice",
      support,
      [
        "Conferir os dados, identificar categorias e verificar se os registros fazem sentido",
        "Escolher apenas os valores que confirmam uma opinião",
        "Apagar valores diferentes sem investigar",
        "Criar a conclusão antes de observar os registros",
      ],
      "Conferir os dados, identificar categorias e verificar se os registros fazem sentido",
      1,
      media,
    ),
    q(
      2,
      "Quando o objetivo é comparar quantidades entre categorias, qual representação costuma facilitar essa comparação?",
      "multiple_choice",
      support,
      ["Gráfico de barras com categorias identificadas", "Texto sem números", "Imagem sem legenda", "Lista sem organização"],
      "Gráfico de barras com categorias identificadas",
    ),
    q(
      3,
      "Qual afirmação representa uma conclusão baseada em dados?",
      "multiple_choice",
      support,
      [
        "A conclusão usa os valores observados e explica a comparação realizada",
        "A conclusão ignora os valores coletados",
        "A conclusão é escolhida antes da análise",
        "A conclusão usa somente uma opinião sem evidência",
      ],
      "A conclusão usa os valores observados e explica a comparação realizada",
    ),
    q(
      4,
      `Aplique a estratégia “${unit.pattern}” ao contexto apresentado. Registre uma comparação e explique o que ela permite concluir.`,
      "open_text",
      `${support}; aceitar frase curta, tabela simples ou palavras-chave`,
      undefined,
      null,
      2,
    ),
  ];
}

function sortingQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const media = mediaForFamily("sorting_lists");
  return [
    q(
      1,
      "Uma lista começa como [7, 3, 5]. O algoritmo compara 7 e 3 e troca os dois porque 7 é maior que 3. Como fica a lista depois dessa troca?",
      "multiple_choice",
      support,
      ["[3, 7, 5]", "[7, 5, 3]", "[3, 5, 7]", "[7, 3, 5]"],
      "[3, 7, 5]",
      1,
      media,
    ),
    q(
      2,
      "Qual ação é essencial em muitos algoritmos de ordenação de listas?",
      "multiple_choice",
      support,
      [
        "Comparar elementos e trocar posições quando necessário",
        "Apagar todos os elementos antes de começar",
        "Transformar todos os valores em texto",
        "Ignorar a posição dos elementos",
      ],
      "Comparar elementos e trocar posições quando necessário",
    ),
    q(
      3,
      "Como verificar se um algoritmo de ordenação está funcionando?",
      "multiple_choice",
      support,
      [
        "Testar listas pequenas e comparar o resultado com a ordem esperada",
        "Executar apenas uma vez e não observar o resultado",
        "Alterar o código sem registrar o que mudou",
        "Usar somente listas que já estão ordenadas",
      ],
      "Testar listas pequenas e comparar o resultado com a ordem esperada",
    ),
    q(
      4,
      "Descreva os passos que você usaria para ordenar a lista [4, 1, 3]. Inclua pelo menos uma comparação e uma possível troca de posição.",
      "open_text",
      `${support}; aceitar pseudocódigo, etapas numeradas ou resposta curta`,
      undefined,
      null,
      2,
    ),
  ];
}

function functionsLoopsQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const media = mediaForFamily("python_functions_loops");
  return [
    q(
      1,
      "Observe o código: def dobro(n): return n * 2. Depois: print(dobro(3)). Qual valor será exibido?",
      "multiple_choice",
      support,
      ["6", "3", "2", "9"],
      "6",
      1,
      media,
    ),
    q(
      2,
      "Qual é uma vantagem de criar uma função em Python?",
      "multiple_choice",
      support,
      [
        "Reunir instruções em um bloco que pode ser chamado sempre que necessário",
        "Fazer o programa ignorar todas as variáveis",
        "Impedir qualquer repetição de código",
        "Transformar automaticamente todo código em imagem",
      ],
      "Reunir instruções em um bloco que pode ser chamado sempre que necessário",
    ),
    q(
      3,
      "Observe: for i in range(3): print(i). Qual sequência será exibida?",
      "multiple_choice",
      support,
      ["0, 1, 2", "1, 2, 3", "3, 2, 1", "0, 1, 2, 3"],
      "0, 1, 2",
    ),
    q(
      4,
      "Escreva um pequeno exemplo ou pseudocódigo que use uma função e um laço de repetição. Explique em uma frase o que ele faz.",
      "open_text",
      `${support}; aceitar código, pseudocódigo ou descrição em etapas`,
      undefined,
      null,
      2,
    ),
  ];
}

function programmingQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const unit = knowledge(input);
  const support = questionSupport(input);
  const media = mediaForFamily("programming");
  return [
    q(
      1,
      `No contexto “${unit.context}”, qual sequência representa melhor um algoritmo que pode ser testado?`,
      "multiple_choice",
      support,
      [
        "Definir entrada, executar passos em ordem, observar a saída e comparar com o resultado esperado",
        "Dar instruções fora de ordem e não observar a saída",
        "Alterar várias partes ao mesmo tempo sem registrar",
        "Ignorar qualquer erro encontrado",
      ],
      "Definir entrada, executar passos em ordem, observar a saída e comparar com o resultado esperado",
      1,
      media,
    ),
    q(
      2,
      "Ao encontrar um erro no programa, qual procedimento ajuda mais na depuração?",
      "multiple_choice",
      support,
      [
        "Testar uma parte de cada vez e comparar o resultado obtido com o esperado",
        "Apagar todo o programa sem investigar",
        "Mudar várias regras ao mesmo tempo",
        "Ignorar a mensagem de erro",
      ],
      "Testar uma parte de cada vez e comparar o resultado obtido com o esperado",
    ),
    q(
      3,
      "Qual registro ajuda a verificar se uma solução computacional funciona?",
      "multiple_choice",
      support,
      [
        "Um caso de teste com entrada e resultado esperado",
        "Somente o título do programa",
        "Uma opinião sem executar o programa",
        "Uma imagem sem relação com o código",
      ],
      "Um caso de teste com entrada e resultado esperado",
    ),
    q(
      4,
      `Aplique a estratégia “${unit.pattern}” ao contexto apresentado. Registre os passos da solução e um caso de teste.`,
      "open_text",
      `${support}; aceitar código, pseudocódigo, fluxograma textual ou etapas numeradas`,
      undefined,
      null,
      2,
    ),
  ];
}

function roboticsQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const media = mediaForFamily("robotics");
  return [
    q(
      1,
      "Um carrinho robótico usa um sensor para detectar um obstáculo à frente. Qual elemento funciona como entrada do sistema?",
      "multiple_choice",
      support,
      ["A distância medida pelo sensor", "A cor da mesa", "O nome do carrinho", "O adesivo colocado no chassi"],
      "A distância medida pelo sensor",
      1,
      media,
    ),
    q(
      2,
      "Qual regra faz o carrinho parar antes de bater?",
      "multiple_choice",
      support,
      [
        "Se a distância for menor que o limite de segurança, desligar os motores",
        "Se houver obstáculo, aumentar a velocidade",
        "Manter os motores ligados em qualquer situação",
        "Ignorar a leitura do sensor",
      ],
      "Se a distância for menor que o limite de segurança, desligar os motores",
    ),
    q(
      3,
      "Qual teste ajuda a verificar se a programação está correta?",
      "multiple_choice",
      support,
      [
        "Colocar o obstáculo em distâncias conhecidas e observar onde o carrinho para",
        "Desligar o sensor durante o teste",
        "Mudar a regra sem registrar o resultado",
        "Testar somente sem obstáculo",
      ],
      "Colocar o obstáculo em distâncias conhecidas e observar onde o carrinho para",
    ),
    q(
      4,
      "Descreva uma sequência curta de entrada, decisão e ação para o carrinho. Você pode escrever em etapas.",
      "open_text",
      `${support}; aceitar etapas, setas, palavras-chave ou registro mediado`,
      undefined,
      null,
      2,
    ),
  ];
}

function digitalToolQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const unit = knowledge(input);
  const support = questionSupport(input);
  const media = mediaForFamily("digital_tools");
  return [
    q(
      1,
      `Na atividade sobre “${input.theme}”, qual sequência ajuda a produzir um material digital claro e verificável?`,
      "multiple_choice",
      support,
      [
        "Definir objetivo, organizar conteúdo, aplicar a ferramenta, conferir e salvar",
        "Clicar em vários comandos sem observar o resultado",
        "Salvar antes de revisar o conteúdo",
        "Usar elementos sem relação com o objetivo",
      ],
      "Definir objetivo, organizar conteúdo, aplicar a ferramenta, conferir e salvar",
      1,
      media,
    ),
    q(
      2,
      "Qual escolha costuma melhorar a legibilidade de um produto digital?",
      "multiple_choice",
      support,
      [
        "Título claro, texto legível, organização visual e descrição de elementos importantes",
        "Texto muito pequeno e sem organização",
        "Imagem sem relação com o conteúdo",
        "Muitas informações sem hierarquia",
      ],
      "Título claro, texto legível, organização visual e descrição de elementos importantes",
    ),
    q(
      3,
      "Antes de finalizar um produto digital, o que deve ser conferido?",
      "multiple_choice",
      support,
      [
        "Se o conteúdo atende ao objetivo e pode ser compreendido pelo público",
        "Somente se o arquivo tem muitas cores",
        "Apenas o tamanho do arquivo",
        "Somente se há uma imagem",
      ],
      "Se o conteúdo atende ao objetivo e pode ser compreendido pelo público",
    ),
    q(
      4,
      `Aplique a estratégia “${unit.pattern}”. Descreva uma alteração concreta que melhoraria o produto digital e explique por quê.`,
      "open_text",
      `${support}; aceitar frase curta, lista ou registro mediado`,
      undefined,
      null,
      2,
    ),
  ];
}

function generalQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const unit = knowledge(input);
  const support = questionSupport(input);
  const primary = unit.concepts[0] || input.theme;
  const secondary = unit.concepts[1] || primary;
  const evidence = unit.assessment[0] || "uma justificativa relacionada ao objetivo";

  return [
    q(
      1,
      `Considere esta situação: ${unit.context}. Qual ação usa melhor o conceito de ${primary} para avançar na atividade?`,
      "multiple_choice",
      support,
      [
        `Aplicar ${unit.pattern} relacionando ${primary} ao objetivo`,
        `Ignorar ${primary} e responder sem observar a situação`,
        "Copiar uma resposta pronta sem aplicar o conteúdo",
        "Registrar apenas uma opinião sem explicar",
      ],
      `Aplicar ${unit.pattern} relacionando ${primary} ao objetivo`,
    ),
    q(
      2,
      `Qual explicação relaciona melhor ${primary} e ${secondary} à situação apresentada?`,
      "multiple_choice",
      support,
      [
        `Usar ${primary} e ${secondary} para explicar a decisão tomada`,
        "Citar palavras do tema sem relacioná-las à situação",
        "Ignorar o objetivo da unidade",
        "Responder sem apresentar nenhuma relação com o conteúdo",
      ],
      `Usar ${primary} e ${secondary} para explicar a decisão tomada`,
    ),
    q(
      3,
      "Qual produção mostra melhor que houve aprendizagem?",
      "multiple_choice",
      support,
      [
        `Apresentar ${evidence}`,
        "Repetir palavras sem explicar",
        "Responder sem procedimento ou justificativa",
        "Manter uma ideia mesmo quando os dados mostram o contrário",
      ],
      `Apresentar ${evidence}`,
    ),
    q(
      4,
      `Aplique “${unit.pattern}” à situação apresentada e explique sua solução usando ${primary}.`,
      "open_text",
      `${support}; aceitar resposta em etapas, palavras-chave ou modalidade escolhida`,
      undefined,
      null,
      2,
    ),
  ];
}

function buildQuestions(input: GeneratorInput) {
  const family = familyFor(input);
  switch (family) {
    case "recommendation_algorithms":
      return { family, questions: recommendationQuestions(input) };
    case "source_literacy":
      return { family, questions: sourceLiteracyQuestions(input) };
    case "digital_safety":
      return { family, questions: digitalSafetyQuestions(input) };
    case "data_types":
      return { family, questions: dataTypeQuestions(input) };
    case "data_analysis":
      return { family, questions: dataAnalysisQuestions(input) };
    case "sorting_lists":
      return { family, questions: sortingQuestions(input) };
    case "python_functions_loops":
      return { family, questions: functionsLoopsQuestions(input) };
    case "programming":
      return { family, questions: programmingQuestions(input) };
    case "robotics":
      return { family, questions: roboticsQuestions(input) };
    case "digital_tools":
      return { family, questions: digitalToolQuestions(input) };
    default:
      return { family, questions: generalQuestions(input) };
  }
}

function teacherGuidance(input: GeneratorInput, unit: ReturnType<typeof knowledge>) {
  const evidence = unit.assessment.length ? unit.assessment.join("; ") : "compreensão do objetivo e justificativa da resposta";
  return [
    `Objetivo avaliado: ${unit.objective}`,
    `Evidências esperadas: ${evidence}.`,
    "Considere adequada a resposta que demonstre compreensão do conceito mesmo sem repetir exatamente o vocabulário técnico.",
    "Se houver dificuldade, retome a situação com perguntas curtas: “O que aconteceu?”, “Qual informação importa?” e “O que você faria agora?”.",
    "Não forneça a alternativa correta antes da tentativa do estudante.",
  ];
}

function aeeGuidance(input: GeneratorInput) {
  const selectedSupports = uniq([
    ...input.learnerProfiles.flatMap((profile) => profileSupportMap[profile] ?? []),
    ...input.supportNeeds,
  ]);
  const modes = input.responseModes.length ? input.responseModes.join(", ") : "seleção ou texto curto";

  return [
    autonomyMap[input.autonomyLevel] ?? autonomyMap.moderate,
    selectedSupports.length
      ? `Apoios previstos: ${selectedSupports.join("; ")}.`
      : "Use linguagem objetiva, releitura e pistas graduais quando necessário.",
    `Formas de resposta aceitas nesta atividade: ${modes}.`,
    input.communicationModes.length
      ? `Respeite a forma de comunicação indicada: ${input.communicationModes.join(", ")}.`
      : "Permita a forma de comunicação que o estudante utiliza com maior autonomia.",
    "A mediação pode esclarecer a tarefa e organizar etapas, mas não deve antecipar a resposta.",
  ];
}

function curriculumChecks(
  input: GeneratorInput,
  unit: ReturnType<typeof knowledge>,
  family: Family,
  questions: GeneratedQuestion[],
  title: string,
): PersonalizationCheck[] {
  const allText = normalizeText(questions.map((question) => `${question.prompt} ${question.options?.join(" ") ?? ""}`).join(" "));
  const anchors = uniq([
    ...tokens(input.theme),
    ...unit.concepts.flatMap(tokens),
  ]).filter((token) => token.length >= 4);
  const matchedAnchors = anchors.filter((anchor) => allText.includes(anchor.slice(0, Math.max(4, anchor.length - 2))));
  const media = questions.find((question) => question.media_url)?.media_url ?? null;
  const expectedMedia = (mediaForFamily(family) as Partial<GeneratedQuestion>).media_url ?? null;
  const legacyPatterns = [
    "campanha de uso responsavel do celular",
    "qual estrategia esta mais alinhada a proposta da unidade",
    "qual producao demonstra melhor que o objetivo de aprendizagem foi alcancado",
    "meta desta etapa",
    "todas as informacoes necessarias estao escritas na tela",
  ];
  const noLegacy = legacyPatterns.every((pattern) => !allText.includes(normalizeText(pattern)));

  return [
    {
      key: "four_answerable_questions",
      passed: questions.length === 4 && questions.every((question) => question.question_type !== "instruction" && (question.points ?? 0) > 0),
      detail: "A atividade contém quatro questões respondíveis e pontuáveis.",
    },
    {
      key: "title_unit_alignment",
      passed: title === `${input.theme} — atividade aplicada`,
      detail: "O título preserva a unidade selecionada e identifica a atividade aplicada.",
    },
    {
      key: "objective_unit_alignment",
      passed: Boolean(unit.objective.trim()) && (input.sourceUnit?.learningObjectives.includes(unit.objective) || unit.objective === input.curriculumObjective),
      detail: "O objetivo utilizado pertence à unidade curricular selecionada.",
    },
    {
      key: "concept_alignment",
      passed: matchedAnchors.length >= Math.min(2, Math.max(1, anchors.length)),
      detail: `As questões retomam conceitos da unidade (${matchedAnchors.slice(0, 4).join(", ") || "sem correspondência suficiente"}).`,
    },
    {
      key: "visual_alignment",
      passed: !media || media === expectedMedia,
      detail: !media ? "A atividade não usa imagem quando não há visual específico confiável." : "O visual selecionado corresponde ao tipo de atividade gerada.",
    },
    {
      key: "no_generic_legacy_template",
      passed: noLegacy,
      detail: noLegacy ? "Nenhum molde genérico legado foi encontrado." : "Foi detectado texto de um molde genérico antigo.",
    },
  ];
}

export function buildGeneratedActivity(input: GeneratorInput): GeneratedActivity {
  const unit = knowledge(input);
  const supportsApplied = uniq([
    ...input.learnerProfiles.flatMap((profile) => profileSupportMap[profile] ?? []),
    ...input.supportNeeds,
  ]);

  const built = buildQuestions(input);
  const personalization = personalizeAndValidate(
    {
      materialKey: input.sourceUnit?.materialKey ?? "manual",
      schoolYear: input.schoolYear,
      objective: unit.objective,
      learnerProfiles: input.learnerProfiles,
      accessBarriers: input.accessBarriers,
      supportNeeds: input.supportNeeds,
      communicationModes: input.communicationModes,
      autonomyLevel: input.autonomyLevel,
      responseModes: input.responseModes,
    },
    built.questions,
  );

  const title = `${input.theme} — atividade aplicada`;
  const checks = [
    ...personalization.checks,
    ...curriculumChecks(input, unit, built.family, personalization.questions, title),
  ];
  const approved = checks.every((check) => check.passed);

  if (!approved) {
    const failed = checks.filter((check) => !check.passed).map((check) => check.detail).join(" ");
    throw new Error(`A atividade não atingiu os critérios de geração: ${failed}`);
  }

  return {
    title,
    learningObjective: unit.objective,
    description: `${unit.focus} Proposta destinada ao ${input.schoolYear}, ${input.term}, construída a partir da unidade oficial “${input.theme}”.`,
    instructions: [
      `Contextualizar por meio de ${unit.context}.`,
      ...ranked(input.sourceUnit?.activityPatterns ?? [], input.theme, 3).map((pattern) => `Conduzir o estudante a ${pattern}.`),
      "Confirmar a compreensão sem fornecer a resposta.",
    ],
    supportsApplied,
    responseGuidance: input.responseModes.length
      ? input.responseModes.map((mode) => `permitir resposta por ${mode.toLowerCase()}`)
      : ["permitir resposta por seleção ou texto curto"],
    teacherNotes: [
      "O perfil orienta o acesso e não aparece para o estudante.",
      "O objetivo curricular é preservado; mudam linguagem, mediação e forma de resposta.",
      autonomyMap[input.autonomyLevel] ?? autonomyMap.moderate,
      input.sourceUnit ? `Referência: ${input.sourceUnit.sourceName} — ${input.theme}.` : "Atividade sem unidade oficial vinculada; revisar antes de publicar.",
    ],
    teacherGuidance: teacherGuidance(input, unit),
    aeeGuidance: aeeGuidance(input),
    assessment: unit.assessment.length
      ? unit.assessment
      : ["Compreende a situação-problema.", "Comunica a resposta pela modalidade escolhida."],
    questions: personalization.questions,
    personalizationSignature: personalization.signature,
    personalizationRules: personalization.rulesApplied,
    validationChecks: checks,
    generationApproved: approved,
    curriculumFamily: built.family,
    ...(input.sourceUnit ? { sourceUnit: input.sourceUnit } : {}),
  };
}
