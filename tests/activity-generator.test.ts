import assert from "node:assert/strict";
import test from "node:test";
import { buildGeneratedActivity, type GeneratorInput } from "../lib/activity-generator.ts";

function input(materialKey: string, theme: string, concept: string, context: string): GeneratorInput {
  return {
    component: "Tecnologia e Inovação",
    schoolYear: "9º ano",
    term: "1º bimestre",
    theme,
    curriculumObjective: `Analisar ${concept} em situações reais.`,
    learnerProfiles: [],
    accessBarriers: [],
    supportNeeds: [],
    communicationModes: ["Língua Portuguesa escrita"],
    autonomyLevel: "moderate",
    responseModes: ["Seleção", "Texto"],
    sourceUnit: {
      materialKey,
      sourceName: "Material oficial de teste",
      teacherMaterials: [],
      studentMaterials: [],
      domain: "media",
      pedagogicalFocus: `Estudo aplicado de ${concept}.`,
      learningObjectives: [`Analisar ${concept} em situações reais.`],
      coreConcepts: [concept, "evidência"],
      authenticContexts: [context],
      activityPatterns: [`comparar evidências sobre ${concept}`],
      assessmentEvidence: [`uma justificativa baseada em ${concept}`],
      misconceptionAlerts: [`confundir opinião com evidência sobre ${concept}`],
      fidelityStatus: "reviewed",
    },
  };
}

test("o gerador usa os dados da unidade em vez de um modelo fixo por assunto", () => {
  const autoria = buildGeneratedActivity(input("unidade-autoria", "Autoria digital", "autoria", "uma postagem sem identificação de autoria"));
  const algoritmos = buildGeneratedActivity(input("unidade-algoritmos", "Recomendação digital", "algoritmos de recomendação", "dois perfis recebem conteúdos diferentes"));

  assert.match(autoria.questions[0].prompt, /postagem sem identificação de autoria/i);
  assert.match(autoria.questions[1].prompt + autoria.questions[1].options?.join(" "), /autoria/i);
  assert.match(algoritmos.questions[0].prompt, /dois perfis recebem conteúdos diferentes/i);
  assert.match(algoritmos.questions[1].prompt + algoritmos.questions[1].options?.join(" "), /algoritmos de recomendação/i);
  assert.notDeepEqual(autoria.questions.map((question) => question.prompt), algoritmos.questions.map((question) => question.prompt));
});

test("a profundidade muda entre anos finais e ensino médio", () => {
  const fundamental = buildGeneratedActivity(input("fundamental", "Autoria digital", "autoria", "uma publicação escolar"));
  const medioInput = input("medio", "Autoria digital", "autoria", "uma publicação escolar");
  medioInput.schoolYear = "2ª série EM";
  const medio = buildGeneratedActivity(medioInput);

  assert.match(fundamental.questions[0].prompt, /analise, aplique e justifique/i);
  assert.match(medio.questions[0].prompt, /compare, avalie e justifique/i);
});
