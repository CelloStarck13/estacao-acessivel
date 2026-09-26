import assert from "node:assert/strict";
import { buildGeneratedActivity } from "../lib/activity-generator.ts";

const sourceUnit = {
  materialKey: "test-unit",
  sourceName: "Unidade oficial de teste",
  teacherMaterials: [],
  studentMaterials: [],
  domain: "programming",
  pedagogicalFocus: "Compreender entrada, processamento, saída e teste.",
  learningObjectives: ["Construir e testar uma sequência lógica."],
  coreConcepts: ["algoritmo", "entrada", "saída"],
  authenticContexts: ["programação de uma rotina escolar"],
  activityPatterns: ["ordenar passos e testar o resultado"],
  assessmentEvidence: ["Organiza os passos e verifica o resultado"],
  misconceptionAlerts: ["Não confundir sequência com decisão"],
  fidelityStatus: "reviewed",
};

function generate(autonomyLevel, responseModes) {
  return buildGeneratedActivity({
    component: "Programação",
    schoolYear: "9º ano",
    term: "1º bimestre",
    theme: "Lógica de programação",
    learnerProfiles: ["TEA"],
    supportNeeds: ["Linguagem objetiva", "Uma etapa por vez"],
    autonomyLevel,
    responseModes,
    sourceUnit,
  });
}

for (const scenario of [
  { autonomy: "intensive", responses: ["Seleção", "Texto"], open: false, maxOptions: 3 },
  { autonomy: "moderate", responses: ["Seleção"], open: false, maxOptions: 3 },
  { autonomy: "autonomous", responses: ["Seleção", "Texto"], open: true, maxOptions: 4 },
]) {
  const activity = generate(scenario.autonomy, scenario.responses);
  const evaluated = activity.questions.filter((question) => question.question_type !== "instruction");
  assert.equal(evaluated.length, 4, `${scenario.autonomy}: deve gerar quatro questões avaliativas`);
  assert.equal(evaluated.some((question) => question.question_type === "open_text"), scenario.open, `${scenario.autonomy}: formato aberto incorreto`);
  for (const question of evaluated.filter((item) => item.question_type === "multiple_choice")) {
    assert.ok((question.options?.length ?? 0) <= scenario.maxOptions, `${scenario.autonomy}: alternativas acima do limite`);
    assert.ok(question.options?.includes(String(question.correct_answer)), `${scenario.autonomy}: gabarito ausente`);
  }
}

assert.match(generate("moderate", ["Seleção"]).title, /atividade aplicada$/);
console.log("Gerador adaptativo: 3 cenários aprovados.");
