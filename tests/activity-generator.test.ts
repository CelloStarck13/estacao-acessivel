import assert from "node:assert/strict";
import test from "node:test";
import { buildGeneratedActivity, type GeneratorInput } from "../lib/activity-generator.ts";

function input(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    component: "Tecnologia e Inovação",
    schoolYear: "9º ano",
    term: "1º bimestre",
    theme: "Redes sociais: conteúdo que se conecta com algoritmos",
    curriculumObjective: "Compreender como interações influenciam recomendações.",
    learnerProfiles: [],
    accessBarriers: [],
    supportNeeds: [],
    communicationModes: ["Língua Portuguesa escrita"],
    autonomyLevel: "moderate",
    responseModes: ["Seleção", "Texto"],
    sourceUnit: {
      materialKey: "unidade-redes",
      sourceName: "Material oficial de teste",
      teacherMaterials: [],
      studentMaterials: [],
      domain: "media",
      pedagogicalFocus: "Estudo de redes sociais e algoritmos de recomendação.",
      learningObjectives: ["Compreender como interações influenciam recomendações em redes sociais."],
      coreConcepts: ["algoritmos de recomendação", "interação", "dados", "personalização"],
      authenticContexts: ["dois perfis recebem recomendações diferentes após interações diferentes"],
      activityPatterns: ["relacionar interação, dado registrado e recomendação"],
      assessmentEvidence: ["explica como uma interação influencia uma recomendação"],
      misconceptionAlerts: ["não tratar recomendação como escolha aleatória"],
      fidelityStatus: "reviewed",
    },
    ...overrides,
  };
}

test("gera quatro questões respondíveis e título da unidade aplicada", () => {
  const activity = buildGeneratedActivity(input());
  assert.equal(activity.questions.length, 4);
  assert.equal(activity.questions.every((question) => question.question_type !== "instruction"), true);
  assert.equal(activity.title, "Redes sociais: conteúdo que se conecta com algoritmos — atividade aplicada");
  assert.equal(activity.generationApproved, true);
});

test("redes sociais com algoritmos gera recomendação, não checagem genérica de fonte", () => {
  const activity = buildGeneratedActivity(input());
  const text = activity.questions.map((question) => `${question.prompt} ${question.options?.join(" ") ?? ""}`).join(" ");
  assert.match(text, /interaç|recomendaç/i);
  assert.doesNotMatch(text, /autor identificado, data, fonte/i);
  assert.equal(activity.curriculumFamily, "recommendation_algorithms");
});

test("ordenação de listas usa situação concreta de lista e troca de posições", () => {
  const activity = buildGeneratedActivity(input({
    component: "Tecnologia e Inovação",
    schoolYear: "8º ano",
    term: "3º bimestre",
    theme: "Algoritmos clássicos: ordenação de lista com Python",
    sourceUnit: {
      materialKey: "lista-python",
      sourceName: "Material oficial de teste",
      teacherMaterials: [],
      studentMaterials: [],
      domain: "programming",
      pedagogicalFocus: "Manipulação e ordenação de listas em Python.",
      learningObjectives: ["Implementar algoritmos de ordenação para manipular listas em Python."],
      coreConcepts: ["listas", "ordenação", "algoritmo", "comparação", "troca"],
      authenticContexts: ["organização de uma lista de pontuações em Python"],
      activityPatterns: ["comparar elementos e trocar posições"],
      assessmentEvidence: ["ordena uma lista e explica comparação e troca"],
      misconceptionAlerts: ["não transformar programação em pergunta abstrata"],
      fidelityStatus: "reviewed",
    },
  }));
  const text = activity.questions.map((question) => question.prompt).join(" ");
  assert.match(text, /\[7, 3, 5\]|troca|ordenar/i);
  assert.equal(activity.curriculumFamily, "sorting_lists");
});

test("gera orientações separadas para regente e AEE sem expor diagnóstico nas questões", () => {
  const activity = buildGeneratedActivity(input({
    learnerProfiles: ["TEA"],
    supportNeeds: ["Linguagem objetiva", "Uma etapa por vez"],
    responseModes: ["Seleção", "Texto"],
  }));
  assert.ok(activity.teacherGuidance.length >= 4);
  assert.ok(activity.aeeGuidance.length >= 4);
  assert.equal(activity.questions.some((question) => question.prompt.includes("TEA")), false);
});
