export type GeneratedQuestion = {
  position: number; prompt: string;
  question_type: "open_text" | "multiple_choice" | "true_false" | "instruction";
  options?: string[]; correct_answer?: string | boolean | null;
  accessibility_support?: string | null; points?: number;
};
export type GeneratedActivity = { title: string; learningObjective: string; description: string; instructions: string[]; supportsApplied: string[]; responseGuidance: string[]; teacherNotes: string[]; assessment: string[]; questions: GeneratedQuestion[] };
type GeneratorInput = { component: string; schoolYear: string; term: string; theme: string; curriculumObjective?: string | null; learnerProfiles: string[]; supportNeeds: string[]; autonomyLevel: string; responseModes: string[] };

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

function cultureDigitalQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  if (/9º/.test(input.schoolYear)) return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO — No grupo da turma apareceu a mensagem: ‘A escola cancelou as aulas amanhã. Compartilhe agora!’. Ela não informa autor, data, fonte oficial nem link. Sua missão é decidir o que fazer antes de repassar a informação.", correct_answer: null, accessibility_support: `${support}; separar visualmente mensagem, pistas e ação`, points: 0 },
    { position: 2, question_type: "multiple_choice", prompt: "Qual ação verifica a confiabilidade da mensagem antes do compartilhamento?", options: ["Consultar o site oficial da escola e conferir autor e data", "Repassar porque foi enviada por um colega", "Acreditar porque a frase parece urgente", "Compartilhar primeiro e verificar depois"], correct_answer: "Consultar o site oficial da escola e conferir autor e data", accessibility_support: support, points: 1 },
    { position: 3, question_type: "multiple_choice", prompt: "Qual conjunto reúne sinais de uma informação mais confiável?", options: ["Autor identificado, data, fonte verificável e confirmação oficial", "Muitas letras maiúsculas e pedido de urgência", "Imagem chamativa e muitos compartilhamentos", "Mensagem curta enviada por pessoa desconhecida"], correct_answer: "Autor identificado, data, fonte verificável e confirmação oficial", accessibility_support: support, points: 1 },
    { position: 4, question_type: "open_text", prompt: "Escreva uma resposta curta para o grupo explicando por que a mensagem não deve ser compartilhada antes da verificação. Você pode usar: fonte, autor, data e confirmação.", correct_answer: null, accessibility_support: `${support}; aceitar resposta curta, palavras-chave ou registro mediado em Libras`, points: 1 },
  ];
  return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO — Uma pessoa desconhecida pede seu endereço e sua senha de jogo em troca de um prêmio. Escolha uma atitude segura.", correct_answer: null, accessibility_support: support, points: 0 },
    { position: 2, question_type: "multiple_choice", prompt: "Qual é a atitude mais segura?", options: ["Não responder, não enviar dados e pedir ajuda a um adulto", "Enviar apenas a senha", "Responder para descobrir quem enviou", "Publicar o endereço no grupo"], correct_answer: "Não responder, não enviar dados e pedir ajuda a um adulto", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Indique uma informação pessoal que não deve ser enviada a desconhecidos na internet.", correct_answer: null, accessibility_support: support, points: 1 },
  ];
}

function mediaQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO — A turma precisa divulgar uma campanha de uso responsável do celular. O cartaz atual tem texto longo, letras pequenas e não informa público, objetivo nem ação esperada. Sua missão é melhorar a comunicação.", correct_answer: null, accessibility_support: `${support}; apresentar o cartaz em blocos: público, mensagem e ação`, points: 0 },
    { position: 2, question_type: "multiple_choice", prompt: "Qual versão comunica melhor a campanha?", options: ["Título curto, imagem relacionada, texto legível e ação clara", "Texto comprido, letras pequenas e nenhuma orientação", "Muitas cores, sem título e sem público definido", "Somente uma imagem, sem descrição ou mensagem"], correct_answer: "Título curto, imagem relacionada, texto legível e ação clara", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Crie uma frase curta para a campanha. Ela deve dizer ao público qual atitude tomar.", correct_answer: null, accessibility_support: `${support}; aceitar digitação, seleção de palavras ou construção mediada`, points: 1 },
  ];
}

function algorithmQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input); const advanced = /9º|série EM/.test(input.schoolYear);
  const context = advanced ? "um aplicativo que verifica se uma senha tem pelo menos 8 caracteres" : "um robô que deve sair da entrada e chegar à mesa";
  return [
    { position: 1, question_type: "instruction", prompt: `DESAFIO — Planeje as instruções para ${context}. Identifique entrada, decisão e resultado esperado.`, correct_answer: null, accessibility_support: support, points: 0 },
    { position: 2, question_type: "multiple_choice", prompt: "Qual estratégia produz um algoritmo que pode ser testado?", options: ["Escrever passos em ordem, executar e corrigir o ponto de erro", "Dar todas as ordens ao mesmo tempo", "Mudar os passos sem registrar", "Ignorar o resultado do teste"], correct_answer: "Escrever passos em ordem, executar e corrigir o ponto de erro", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Registre uma sequência curta de passos para resolver o desafio e indique o que deve acontecer ao final.", correct_answer: null, accessibility_support: support, points: 2 },
  ];
}

function roboticsQuestions(input: GeneratorInput): GeneratedQuestion[] {
  const support = questionSupport(input);
  return [
    { position: 1, question_type: "instruction", prompt: "DESAFIO MAKER — Um carrinho robótico deve parar antes de tocar um obstáculo. Considere sensor, distância de segurança, movimento e teste.", correct_answer: null, accessibility_support: support, points: 0 },
    { position: 2, question_type: "multiple_choice", prompt: "Qual lógica permite ao carrinho parar com segurança?", options: ["Se a distância for menor que o limite, parar os motores", "Se detectar obstáculo, aumentar a velocidade", "Manter os motores ligados em qualquer situação", "Desligar o sensor durante o percurso"], correct_answer: "Se a distância for menor que o limite, parar os motores", accessibility_support: support, points: 1 },
    { position: 3, question_type: "open_text", prompt: "Indique um teste que você faria para saber se o carrinho para na distância correta.", correct_answer: null, accessibility_support: support, points: 1 },
  ];
}

function questionsFor(input: GeneratorInput) {
  const normalized = `${input.theme} ${input.component}`.toLowerCase();
  if (normalized.includes("cultura digital") || normalized.includes("cidadania")) return cultureDigitalQuestions(input);
  if (normalized.includes("mídia") || normalized.includes("comunica")) return mediaQuestions(input);
  if (normalized.includes("robó") || normalized.includes("maker") || normalized.includes("automação")) return roboticsQuestions(input);
  return algorithmQuestions(input);
}

export function buildGeneratedActivity(input: GeneratorInput): GeneratedActivity {
  const supportsApplied = uniq([...input.learnerProfiles.flatMap((profile) => profileSupportMap[profile] ?? []), ...input.supportNeeds]);
  const prefix = input.component === "Programação" ? "Missão Código" : input.component === "Robótica" ? "Desafio Maker" : "Conexão Digital";
  return {
    title: `${prefix}: ${input.theme}`,
    learningObjective: input.curriculumObjective || `Aplicar conhecimentos de ${input.theme} em uma situação-problema adequada ao ${input.schoolYear}.`,
    description: `Situação-problema de ${input.component} para ${input.schoolYear}, ${input.term}, alinhada a ${input.theme}. O estudante analisa evidências, toma uma decisão e comunica sua compreensão com os apoios selecionados.`,
    instructions: ["Apresentar o objetivo antes do desafio.", "Mostrar uma etapa por vez quando esse apoio estiver selecionado.", "Confirmar a compreensão sem fornecer a resposta.", "Permitir revisão antes do envio."],
    supportsApplied,
    responseGuidance: input.responseModes.length ? input.responseModes.map((mode) => `permitir resposta por ${mode.toLowerCase()}`) : ["permitir resposta por seleção ou texto curto"],
    teacherNotes: ["O perfil orienta o acesso e não aparece para o estudante.", "O objetivo curricular é preservado; mudam linguagem, mediação e forma de resposta.", autonomyMap[input.autonomyLevel] ?? autonomyMap.moderate],
    assessment: ["Compreende a situação-problema.", "Seleciona evidências relevantes.", "Toma decisão coerente com o objetivo.", "Comunica a resposta pela modalidade escolhida."],
    questions: questionsFor(input),
  };
}
