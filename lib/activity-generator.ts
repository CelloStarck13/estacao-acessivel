export type GeneratedQuestion = {
  position: number; prompt: string;
  question_type: "open_text" | "multiple_choice" | "true_false" | "instruction";
  options?: string[]; correct_answer?: string | boolean | null;
  accessibility_support?: string | null; points?: number;
  media_url?: string | null; media_alt?: string | null; media_caption?: string | null;
};
export type GeneratedActivity = { title: string; learningObjective: string; description: string; instructions: string[]; supportsApplied: string[]; responseGuidance: string[]; teacherNotes: string[]; assessment: string[]; questions: GeneratedQuestion[]; sourceUnit?: GeneratorInput["sourceUnit"] };
type GeneratorInput = { component: string; schoolYear: string; term: string; theme: string; curriculumObjective?: string | null; learnerProfiles: string[]; supportNeeds: string[]; autonomyLevel: string; responseModes: string[]; sourceUnit?: { materialKey: string; sourceName: string; teacherMaterials: Array<{label:string;url:string}>; studentMaterials: Array<{label:string;url:string}>; domain: string; pedagogicalFocus: string; learningObjectives: string[]; coreConcepts: string[]; authenticContexts: string[]; activityPatterns: string[]; assessmentEvidence: string[]; misconceptionAlerts: string[]; fidelityStatus: "extracted" | "reviewed" } | null };

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

function cultureDigitalQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const unit = knowledge(input);
  if (/9º/.test(input.schoolYear)) return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO — No grupo da turma apareceu a mensagem: ‘A escola cancelou as aulas amanhã. Compartilhe agora!’. Ela não informa autor, data, fonte oficial nem link. Sua missão é decidir o que fazer antes de repassar a informação.", correct_answer: null, accessibility_support: `${support}; separar visualmente mensagem, pistas e ação`, points: 0, media_url: "/activity-media/verificar-informacao.svg", media_alt: "Comparação entre uma mensagem sem fonte e uma informação confirmada por fonte oficial", media_caption: "Observe os sinais de confiabilidade antes de compartilhar." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual ação verifica a confiabilidade da mensagem antes do compartilhamento?", options: ["Consultar o site oficial da escola e conferir autor e data", "Repassar porque foi enviada por um colega", "Acreditar porque a frase parece urgente", "Compartilhar primeiro e verificar depois"], correct_answer: "Consultar o site oficial da escola e conferir autor e data", accessibility_support: support, points: 1 },
    { position: 3, question_type: "multiple_choice", prompt: "Qual conjunto reúne sinais de uma informação mais confiável?", options: ["Autor identificado, data, fonte verificável e confirmação oficial", "Muitas letras maiúsculas e pedido de urgência", "Imagem chamativa e muitos compartilhamentos", "Mensagem curta enviada por pessoa desconhecida"], correct_answer: "Autor identificado, data, fonte verificável e confirmação oficial", accessibility_support: support, points: 1 },
    { position: 4, question_type: "open_text", prompt: "Escreva uma resposta curta para o grupo explicando por que a mensagem não deve ser compartilhada antes da verificação. Você pode usar: fonte, autor, data e confirmação.", correct_answer: null, accessibility_support: `${support}; aceitar resposta curta, palavras-chave ou registro mediado em Libras`, points: 1 },
  ];
  return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO — Uma pessoa desconhecida pede seu endereço e sua senha de jogo em troca de um prêmio. Escolha uma atitude segura.", correct_answer: null, accessibility_support: support, points: 0, media_url: "/activity-media/seguranca-digital.svg", media_alt: "Escudo protegendo senha e dados pessoais de uma mensagem desconhecida", media_caption: "Dados pessoais e senhas devem ser protegidos." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual é a atitude mais segura?", options: ["Não responder, não enviar dados e pedir ajuda a um adulto", "Enviar apenas a senha", "Responder para descobrir quem enviou", "Publicar o endereço no grupo"], correct_answer: "Não responder, não enviar dados e pedir ajuda a um adulto", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Indique uma informação pessoal que não deve ser enviada a desconhecidos na internet.", correct_answer: null, accessibility_support: support, points: 1 },
  ];
}

function mediaQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const unit = knowledge(input);
  const title = input.theme.toLowerCase();
  if (title.includes("redes sociais") || title.includes("algoritmos")) return [
    { position: 1, question_type: "instruction", prompt: `INVESTIGAÇÃO — Em ${unit.context}, dois perfis recebem recomendações diferentes depois de interagir com conteúdos distintos. Analise como as escolhas do usuário e o sistema de recomendação influenciam o que aparece na tela.`, correct_answer: null, accessibility_support: `${support}; representar visualmente interação, dado coletado e recomendação`, points: 0, media_url: "/activity-media/verificar-informacao.svg", media_alt: "Dois fluxos de recomendação mostrando interações diferentes e conteúdos sugeridos", media_caption: "As recomendações podem ser influenciadas pelas interações registradas." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual explicação descreve melhor a relação entre interação e recomendação?", options: ["O sistema usa sinais de interação para selecionar conteúdos que considera relevantes", "Todas as pessoas recebem sempre os mesmos conteúdos", "A recomendação acontece sem utilizar nenhum dado", "Somente a quantidade de seguidores define tudo que aparece"], correct_answer: "O sistema usa sinais de interação para selecionar conteúdos que considera relevantes", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: `Aplique esta ação: ${unit.pattern}. Explique uma consequência positiva e um risco das recomendações personalizadas.`, correct_answer: null, accessibility_support: `${support}; aceitar duas frases curtas, quadro visual ou resposta em Libras`, points: 2 },
  ];
  if (title.includes("ia ") || title.includes("inteligência")) return [
    { position: 1, question_type: "instruction", prompt: `DESAFIO DE IA — Use o contexto “${unit.context}”. Uma ferramenta de IA propôs uma explicação para um problema social, mas não informou fontes nem limites. Verifique a resposta antes de utilizá-la.`, correct_answer: null, accessibility_support: `${support}; separar afirmação, evidência, fonte e limite`, points: 0, media_url: "/activity-media/verificar-informacao.svg", media_alt: "Resposta de inteligência artificial sendo conferida com fontes e evidências", media_caption: "Uma resposta de IA precisa ser verificada antes de orientar decisões." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual procedimento torna o uso da IA mais responsável?", options: ["Comparar a resposta com fontes confiáveis e identificar possíveis limites ou vieses", "Usar a primeira resposta sem conferir", "Considerar toda resposta de IA como fato", "Retirar o contexto para obter uma resposta mais curta"], correct_answer: "Comparar a resposta com fontes confiáveis e identificar possíveis limites ou vieses", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: `Com base no objetivo “${unit.objective}”, escreva uma pergunta de verificação que você faria antes de aceitar a resposta da IA.`, correct_answer: null, accessibility_support: `${support}; aceitar pergunta curta, seleção de palavras-chave ou Libras`, points: 2 },
  ];
  return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO — A turma precisa divulgar uma campanha de uso responsável do celular. O cartaz atual tem texto longo, letras pequenas e não informa público, objetivo nem ação esperada. Sua missão é melhorar a comunicação.", correct_answer: null, accessibility_support: `${support}; apresentar o cartaz em blocos: público, mensagem e ação`, points: 0, media_url: "/activity-media/comunicacao-acessivel.svg", media_alt: "Cartaz organizado em título, imagem, mensagem curta e chamada para ação", media_caption: "Uma comunicação acessível organiza as informações essenciais." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual versão comunica melhor a campanha?", options: ["Título curto, imagem relacionada, texto legível e ação clara", "Texto comprido, letras pequenas e nenhuma orientação", "Muitas cores, sem título e sem público definido", "Somente uma imagem, sem descrição ou mensagem"], correct_answer: "Título curto, imagem relacionada, texto legível e ação clara", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Crie uma frase curta para a campanha. Ela deve dizer ao público qual atitude tomar.", correct_answer: null, accessibility_support: `${support}; aceitar digitação, seleção de palavras ou construção mediada`, points: 1 },
  ];
}

function algorithmQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input); const theme = input.theme.toLowerCase(); const unit = knowledge(input);
  const context = theme.includes("python") ? "um programa em Python que recebe dados, processa uma regra e apresenta um resultado" : theme.includes("recurs") || theme.includes("repet") || theme.includes("laço") ? "um desenho que repete um padrão e altera tamanho ou posição a cada etapa" : theme.includes("lista") || theme.includes("ordena") ? "uma lista de valores que precisa ser organizada e verificada" : theme.includes("p5") || theme.includes("arte") || theme.includes("cores") ? "uma composição digital interativa que reage à posição do ponteiro" : "uma solução computacional com entrada, processamento e saída";
  return [
    { position: 1, question_type: "instruction", prompt: `DESAFIO — Na unidade “${input.theme}”, planeje ${context}. Use estes conceitos como referência: ${unit.concepts.join(", ")}. Identifique entrada, processamento e resultado esperado.`, correct_answer: null, accessibility_support: support, points: 0, media_url: "/activity-media/fluxo-algoritmo.svg", media_alt: "Fluxo visual com início, entrada, decisão e resultado", media_caption: "Organize o problema em uma sequência que possa ser testada." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual estratégia produz um algoritmo que pode ser testado?", options: ["Escrever passos em ordem, executar e corrigir o ponto de erro", "Dar todas as ordens ao mesmo tempo", "Mudar os passos sem registrar", "Ignorar o resultado do teste"], correct_answer: "Escrever passos em ordem, executar e corrigir o ponto de erro", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: `Aplique esta estratégia da unidade: ${unit.pattern}. Registre a solução e um caso de teste que permita verificar o resultado.`, correct_answer: null, accessibility_support: support, points: 2 },
  ];
}

function dataQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  const subject = input.theme.toLowerCase().includes("tela") ? "tempo diário de uso de telas" : input.theme.toLowerCase().includes("acessibilidade") ? "condições de acessibilidade da comunidade" : "dados coletados pela turma";
  return [
    { position: 1, question_type: "instruction", prompt: `INVESTIGAÇÃO — A turma reuniu uma planilha sobre ${subject}. Antes de concluir, é preciso conferir os dados, escolher uma representação adequada e explicar o que ela mostra.`, correct_answer: null, accessibility_support: support, points: 0, media_url: "/activity-media/leitura-dados.svg", media_alt: "Tabela simples transformada em gráfico de barras com categorias identificadas", media_caption: "Dados organizados ajudam a comparar valores e reconhecer padrões." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual procedimento torna a análise mais confiável?", options: ["Conferir os dados, identificar categorias e comparar os valores", "Escolher apenas os valores que confirmam uma opinião", "Apagar valores diferentes sem verificar", "Criar uma conclusão antes de observar a planilha"], correct_answer: "Conferir os dados, identificar categorias e comparar os valores", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Registre uma comparação que poderia ser feita com esses dados e explique qual informação ela ajudaria a compreender.", correct_answer: null, accessibility_support: `${support}; aceitar frase curta, palavras-chave ou resposta mediada`, points: 2 },
  ];
}

function digitalToolQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  return [
    { position: 1, question_type: "instruction", prompt: `TAREFA PRÁTICA — Na unidade “${input.theme}”, organize um produto digital legível. Identifique a ferramenta necessária, execute uma alteração e confira o resultado antes de salvar.`, correct_answer: null, accessibility_support: support, points: 0, media_url: "/activity-media/comunicacao-acessivel.svg", media_alt: "Documento digital com título, imagem e texto organizados", media_caption: "Organize o conteúdo para facilitar leitura e compreensão." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual sequência ajuda a realizar a tarefa com segurança?", options: ["Selecionar a ferramenta, aplicar a alteração, conferir e salvar", "Clicar em vários comandos sem observar", "Fechar antes de conferir", "Apagar o conteúdo original sem necessidade"], correct_answer: "Selecionar a ferramenta, aplicar a alteração, conferir e salvar", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Indique uma alteração que melhora a leitura ou a organização do produto digital.", correct_answer: null, accessibility_support: support, points: 1 },
  ];
}

function roboticsQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO MAKER — Um carrinho robótico deve parar antes de tocar um obstáculo. Considere sensor, distância de segurança, movimento e teste.", correct_answer: null, accessibility_support: support, points: 0, media_url: "/activity-media/robo-sensor.svg", media_alt: "Carrinho robótico usando um sensor para identificar um obstáculo à frente", media_caption: "O sensor fornece a entrada usada para decidir quando parar." },
    { position: 2, question_type: "multiple_choice", prompt: "Qual lógica permite ao carrinho parar com segurança?", options: ["Se a distância for menor que o limite, parar os motores", "Se detectar obstáculo, aumentar a velocidade", "Manter os motores ligados em qualquer situação", "Desligar o sensor durante o percurso"], correct_answer: "Se a distância for menor que o limite, parar os motores", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Indique um teste que você faria para saber se o carrinho para na distância correta.", correct_answer: null, accessibility_support: support, points: 1 },
  ];
}

function questionsFor(input: GeneratorInput) {
  const normalized = `${input.theme} ${input.component}`.toLowerCase();
  const domain = input.sourceUnit?.domain;
  if (domain === "media") return mediaQuestions(input);
  if (domain === "digital_citizenship") return cultureDigitalQuestions(input);
  if (domain === "data") return dataQuestions(input);
  if (domain === "digital_tools") return digitalToolQuestions(input);
  if (domain === "robotics") return roboticsQuestions(input);
  if (domain === "programming" || domain === "computational_thinking") return algorithmQuestions(input);
  if (normalized.includes("cultura digital") || normalized.includes("cidadania") || normalized.includes("segurança") || normalized.includes("proteção digital")) return cultureDigitalQuestions(input);
  if (normalized.includes("midi") || normalized.includes("comunica") || normalized.includes("informação") || normalized.includes("redes sociais") || normalized.includes("autor ia")) return mediaQuestions(input);
  if (normalized.includes("planilha") || normalized.includes("ciência de dados") || normalized.includes("análise de dados") || normalized.includes("simulação")) return dataQuestions(input);
  if (normalized.includes("edição de texto") || normalized.includes("mouse") || normalized.includes("teclado") || normalized.includes("primeiro flashcard")) return digitalToolQuestions(input);
  if (normalized.includes("robó") || normalized.includes("maker") || normalized.includes("automação")) return roboticsQuestions(input);
  return algorithmQuestions(input);
}

export function buildGeneratedActivity(input: GeneratorInput): GeneratedActivity {
  const unit = knowledge(input);
  const supportsApplied = uniq([...input.learnerProfiles.flatMap((profile) => profileSupportMap[profile] ?? []), ...input.supportNeeds]);
  const prefix = input.component === "Programação" ? "Missão Código" : input.component === "Robótica" ? "Desafio Maker" : "Conexão Digital";
  return {
    title: `${prefix}: ${input.theme}`,
    learningObjective: unit.objective,
    description: `${unit.focus} Proposta destinada ao ${input.schoolYear}, ${input.term}, construída a partir da unidade oficial “${input.theme}”.`,
    instructions: [`Contextualizar por meio de ${unit.context}.`, ...input.sourceUnit!.activityPatterns.slice(0, 3).map((pattern) => `Conduzir o estudante a ${pattern}.`), "Confirmar a compreensão sem fornecer a resposta."],
    supportsApplied,
    responseGuidance: input.responseModes.length ? input.responseModes.map((mode) => `permitir resposta por ${mode.toLowerCase()}`) : ["permitir resposta por seleção ou texto curto"],
    teacherNotes: ["O perfil orienta o acesso e não aparece para o estudante.", "O objetivo curricular é preservado; mudam linguagem, mediação e forma de resposta.", autonomyMap[input.autonomyLevel] ?? autonomyMap.moderate, input.sourceUnit ? `Referência: ${input.sourceUnit.sourceName} — ${input.theme}.` : "Atividade sem unidade oficial vinculada; revisar antes de publicar."],
    assessment: unit.assessment.length ? unit.assessment : ["Compreende a situação-problema.", "Comunica a resposta pela modalidade escolhida."],
    questions: questionsFor(input),
    ...(input.sourceUnit ? { sourceUnit: input.sourceUnit } : {}),
  };
}
