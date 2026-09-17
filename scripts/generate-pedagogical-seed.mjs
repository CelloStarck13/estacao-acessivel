import { mkdir, readFile, writeFile } from "node:fs/promises";

const index = JSON.parse(await readFile("db/seeds/pedagogical-index.json", "utf8"));

const domainProfiles = {
  media: {
    focus: "Analisar criticamente mensagens, fontes, autoria, intenção e circulação de informações em ambientes digitais.",
    concepts: ["autoria", "fonte", "evidência", "intenção comunicativa", "checagem", "circulação algorítmica"],
    contexts: ["análise de publicação realista", "comparação entre fontes", "produção de comunicação responsável"],
    patterns: ["investigar pistas de confiabilidade", "comparar versões e fontes", "justificar uma decisão de publicação", "produzir mensagem acessível"],
    evidence: ["identifica fonte, autoria e data", "distingue afirmação de evidência", "justifica a decisão com critérios", "comunica de forma ética e acessível"],
    alerts: ["não reduzir educação midiática a uma pergunta genérica sobre segurança", "não considerar popularidade como prova de veracidade"],
  },
  digital_citizenship: {
    focus: "Participar de ambientes digitais com segurança, ética, responsabilidade e compreensão dos impactos sociais e ambientais da tecnologia.",
    concepts: ["convivência digital", "privacidade", "segurança", "responsabilidade", "sustentabilidade", "cidadania digital"],
    contexts: ["decisão em fórum ou rede", "proteção de dados", "escolha consciente de tecnologia"],
    patterns: ["avaliar uma situação digital", "reconhecer risco ou impacto", "escolher uma ação responsável", "explicar consequências"],
    evidence: ["reconhece comportamento seguro e ético", "antecipa consequências", "protege informações", "propõe ação responsável"],
    alerts: ["não usar moralismo sem situação concreta", "não exigir informação pessoal do estudante"],
  },
  programming: {
    focus: "Resolver problemas por decomposição, representação algorítmica, implementação, teste e depuração.",
    concepts: ["algoritmo", "sequência", "variável", "condicional", "repetição", "função", "teste", "depuração"],
    contexts: ["construção de programa ou jogo", "análise de código", "correção de erro", "automação de solução"],
    patterns: ["prever a saída", "ordenar instruções", "completar ou corrigir código", "testar casos", "explicar a estratégia"],
    evidence: ["decompõe o problema", "organiza instruções", "relaciona entrada, processamento e saída", "localiza e corrige erro"],
    alerts: ["não transformar programação em pergunta abstrata sem código ou algoritmo", "não repetir o mesmo desafio para anos diferentes"],
  },
  data: {
    focus: "Coletar, organizar, representar e interpretar dados para responder a uma pergunta investigável.",
    concepts: ["variável", "categoria", "tabela", "gráfico", "comparação", "padrão", "conclusão baseada em dados"],
    contexts: ["investigação de dados da turma ou comunidade", "planilha", "simulação", "tomada de decisão"],
    patterns: ["formular pergunta investigável", "organizar dados", "escolher representação", "comparar valores", "sustentar conclusão"],
    evidence: ["confere a qualidade dos dados", "seleciona representação adequada", "identifica padrão", "produz conclusão compatível"],
    alerts: ["não apresentar gráfico sem descrição textual", "não induzir conclusão antes da análise"],
  },
  digital_tools: {
    focus: "Utilizar ferramentas digitais de modo intencional para criar, organizar, revisar e publicar produtos acessíveis.",
    concepts: ["interface", "edição", "formatação", "organização", "acessibilidade", "revisão", "publicação"],
    contexts: ["edição de documento", "produção de página", "navegação por interface", "revisão de produto digital"],
    patterns: ["localizar ferramenta", "executar alteração", "comparar antes e depois", "revisar acessibilidade", "salvar ou publicar"],
    evidence: ["seleciona a ferramenta adequada", "realiza procedimento em ordem", "confere o resultado", "aplica critério de acessibilidade"],
    alerts: ["não avaliar apenas memorização de ícones", "não depender exclusivamente de precisão motora"],
  },
  robotics: {
    focus: "Projetar, montar, programar e testar sistemas físicos que relacionem sensores, decisões e atuadores.",
    concepts: ["sensor", "atuador", "entrada", "controle", "movimento", "teste", "prototipagem"],
    contexts: ["protótipo robótico", "automação", "desafio maker", "teste de comportamento"],
    patterns: ["identificar entrada e saída", "planejar montagem", "programar regra", "testar e ajustar"],
    evidence: ["relaciona sensor e decisão", "prevê comportamento", "registra teste", "propõe ajuste"],
    alerts: ["não exigir montagem física quando o recurso não estiver disponível", "não confundir decoração com solução funcional"],
  },
  computational_thinking: {
    focus: "Representar e resolver problemas por decomposição, reconhecimento de padrões, abstração e algoritmos.",
    concepts: ["decomposição", "padrão", "abstração", "algoritmo", "teste"],
    contexts: ["problema cotidiano", "sequência lógica", "representação de solução"],
    patterns: ["decompor", "reconhecer padrão", "ordenar passos", "testar solução"],
    evidence: ["identifica partes do problema", "representa estratégia", "verifica resultado"],
    alerts: ["não usar atividade descontextualizada", "não confundir rapidez com compreensão"],
  },
};

function q(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function json(value) { return `${q(JSON.stringify(value))}::jsonb`; }
function fallbackObjective(unit, profile) {
  return `Aplicar conhecimentos de ${unit.unit_title} em uma situação autêntica, usando ${profile.concepts.slice(0, 3).join(", ")} e justificando a solução.`;
}

const statements = [];
for (const unit of index.units) {
  const profile = domainProfiles[unit.domain] ?? domainProfiles.computational_thinking;
  const objectives = unit.learning_objectives.length ? unit.learning_objectives : [fallbackObjective(unit, profile)];
  const concepts = [...new Set([...profile.concepts, ...unit.keywords.slice(0, 8)])].slice(0, 14);
  const sourceDocuments = unit.source_documents.map(({ label, url }) => ({ label, url, status: "official" }));
  statements.push(`(${q(unit.material_key)},${q(unit.component)},${q(unit.school_year)},${q(unit.term)},${q(unit.unit_title)},${q(unit.domain)},${q(unit.unit_summary || profile.focus)},${json(objectives)},${json(concepts)},${json(profile.contexts)},${json(profile.patterns)},${json(profile.evidence)},${json(profile.alerts)},${json(sourceDocuments)},${q(unit.extraction_status === "extracted" ? "extracted" : "catalogued")},${unit.extraction_status === "extracted" ? "true" : "false"})`);
}

const sql = `\ninsert into public.pedagogical_units\n(material_key, component, school_year, term, unit_title, domain, pedagogical_focus, learning_objectives, core_concepts, authentic_contexts, activity_patterns, assessment_evidence, misconception_alerts, source_documents, fidelity_status, ready_for_generation)\nvalues\n${statements.join(",\n")}\non conflict (material_key) do update set\n component=excluded.component, school_year=excluded.school_year, term=excluded.term, unit_title=excluded.unit_title, domain=excluded.domain, pedagogical_focus=excluded.pedagogical_focus, learning_objectives=excluded.learning_objectives, core_concepts=excluded.core_concepts, authentic_contexts=excluded.authentic_contexts, activity_patterns=excluded.activity_patterns, assessment_evidence=excluded.assessment_evidence, misconception_alerts=excluded.misconception_alerts, source_documents=excluded.source_documents, fidelity_status=excluded.fidelity_status, ready_for_generation=excluded.ready_for_generation, updated_at=now();\n`;

await writeFile("db/seeds/pedagogical-units.sql", sql);
await mkdir("db/seeds/pedagogical-batches", { recursive: true });
for (let offset = 0; offset < statements.length; offset += 4) {
  const batch = `insert into public.pedagogical_units\n(material_key, component, school_year, term, unit_title, domain, pedagogical_focus, learning_objectives, core_concepts, authentic_contexts, activity_patterns, assessment_evidence, misconception_alerts, source_documents, fidelity_status, ready_for_generation)\nvalues\n${statements.slice(offset, offset + 4).join(",\n")}\non conflict (material_key) do update set component=excluded.component, school_year=excluded.school_year, term=excluded.term, unit_title=excluded.unit_title, domain=excluded.domain, pedagogical_focus=excluded.pedagogical_focus, learning_objectives=excluded.learning_objectives, core_concepts=excluded.core_concepts, authentic_contexts=excluded.authentic_contexts, activity_patterns=excluded.activity_patterns, assessment_evidence=excluded.assessment_evidence, misconception_alerts=excluded.misconception_alerts, source_documents=excluded.source_documents, fidelity_status=excluded.fidelity_status, ready_for_generation=excluded.ready_for_generation, updated_at=now();\n`;
  await writeFile(`db/seeds/pedagogical-batches/${String(offset / 4 + 1).padStart(2, "0")}.sql`, batch);
}
console.log(`Generated ${index.units.length} pedagogical unit records.`);
