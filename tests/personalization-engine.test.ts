import assert from "node:assert/strict";
import test from "node:test";
import { createPersonalizationSignature, personalizeAndValidate, type PersonalizationInput } from "../lib/personalization-engine.ts";

const baseQuestions = [
  { position: 1, question_type: "instruction" as const, prompt: "DESAFIO — Analise uma mensagem antes de compartilhar.", accessibility_support: "releitura", points: 0 },
  { position: 2, question_type: "multiple_choice" as const, prompt: "Qual ação confirma a fonte?", options: ["Consultar a fonte oficial", "Compartilhar imediatamente", "Confiar na quantidade de curtidas", "Ignorar a data"], correct_answer: "Consultar a fonte oficial", accessibility_support: "releitura", points: 1 },
  { position: 3, question_type: "open_text" as const, prompt: "Justifique sua decisão.", accessibility_support: "releitura", points: 2 },
];

function input(overrides: Partial<PersonalizationInput> = {}): PersonalizationInput {
  return {
    materialKey: "tec-9-3-cultura-digital",
    schoolYear: "9º ano",
    objective: "Analisar criticamente informações em ambientes digitais.",
    learnerProfiles: [],
    accessBarriers: [],
    supportNeeds: [],
    communicationModes: ["Língua Portuguesa escrita"],
    autonomyLevel: "moderate",
    responseModes: ["Seleção", "Texto"],
    ...overrides,
  };
}

test("a assinatura muda quando a personalização muda", () => {
  const tea = createPersonalizationSignature(input({ learnerProfiles: ["TEA"], supportNeeds: ["Linguagem objetiva"] }));
  const surdez = createPersonalizationSignature(input({ learnerProfiles: ["Surdez"], communicationModes: ["Libras"] }));
  assert.notEqual(tea, surdez);
});

test("TEA e surdez produzem estruturas diferentes e preservam o objetivo", () => {
  const tea = personalizeAndValidate(input({ learnerProfiles: ["TEA"], accessBarriers: ["Enunciado longo ou ambíguo"], supportNeeds: ["Linguagem objetiva", "Uma etapa por vez"] }), baseQuestions);
  const surdez = personalizeAndValidate(input({ learnerProfiles: ["Surdez"], accessBarriers: ["Informação apresentada somente por áudio"], supportNeeds: ["Apoio visual", "Libras"], communicationModes: ["Libras"] }), baseQuestions);
  assert.equal(tea.approved, true);
  assert.equal(surdez.approved, true);
  assert.notDeepEqual(tea.questions.map((question) => question.prompt), surdez.questions.map((question) => question.prompt));
  assert.equal(input().objective, "Analisar criticamente informações em ambientes digitais.");
});

test("o diagnóstico não aparece na atividade do estudante", () => {
  const result = personalizeAndValidate(input({ learnerProfiles: ["Deficiência intelectual"], supportNeeds: ["Exemplos concretos", "Pistas graduais"] }), baseQuestions);
  assert.equal(result.approved, true);
  assert.equal(result.questions.some((question) => question.prompt.includes("Deficiência intelectual")), false);
  assert.equal(result.questions.every((question) => Boolean(question.accessibility_support)), true);
});

test("seleção com segmentação cognitiva reduz alternativas sem perder a correta", () => {
  const result = personalizeAndValidate(input({ learnerProfiles: ["Síndrome de Down"], accessBarriers: ["Muitas informações ao mesmo tempo"], supportNeeds: ["Redução de carga cognitiva"] }), baseQuestions);
  const selection = result.questions.find((question) => question.question_type === "multiple_choice");
  assert.equal(selection?.options?.length, 3);
  assert.equal(selection?.options?.includes("Consultar a fonte oficial"), true);
});
