import assert from "node:assert/strict";
import test from "node:test";
import { adaptExistingMaterial } from "../lib/material-adapter.ts";

const baseText = "A programação organiza instruções para resolver problemas. Uma função reúne comandos que podem ser reutilizados. Um laço repete instruções quando necessário. O estudante pode testar o resultado e corrigir erros.";

test("TEA produz blocos curtos e orientação de uma etapa por vez", () => {
  const result = adaptExistingMaterial({
    title: "Programação",
    originalText: baseText,
    learnerProfiles: ["TEA"],
    supportNeeds: ["Uma etapa por vez", "Linguagem objetiva"],
    communicationModes: ["Língua Portuguesa escrita"],
    autonomyLevel: "moderate",
    responseModes: ["Seleção", "Texto"],
  });
  assert.ok(result.blocks.length >= 3);
  assert.match(result.studentIntro, /uma parte por vez/i);
  assert.ok(result.aeeGuidance.some((item) => /sequência/i.test(item)));
});

test("cegueira inclui orientação para não depender de imagem", () => {
  const result = adaptExistingMaterial({
    title: "Material",
    originalText: baseText,
    learnerProfiles: ["Cegueira"],
    supportNeeds: ["Descrição textual de imagens", "Tecnologia assistiva"],
    communicationModes: ["Língua Portuguesa escrita"],
    autonomyLevel: "moderate",
    responseModes: ["Texto"],
  });
  assert.ok(result.teacherGuidance.some((item) => /imagem como única fonte/i.test(item)));
  assert.ok(result.accessibilityNotes.some((item) => /sem enxergar as imagens/i.test(item)));
});

test("surdez mantém informação essencial em texto", () => {
  const result = adaptExistingMaterial({
    title: "Material",
    originalText: baseText,
    learnerProfiles: ["Surdez"],
    supportNeeds: ["Apoio visual", "Libras"],
    communicationModes: ["Libras"],
    autonomyLevel: "moderate",
    responseModes: ["Seleção", "Texto"],
  });
  assert.ok(result.supportsApplied.some((item) => /Informações essenciais em texto/i.test(item)));
  assert.ok(result.aeeGuidance.some((item) => /Libras/i.test(item)));
});


test("material sem perguntas vira atividade aplicável com quatro questões", () => {
  const result = adaptExistingMaterial({
    title: "Programação",
    originalText: baseText,
    learnerProfiles: ["TEA"],
    supportNeeds: ["Uma etapa por vez", "Linguagem objetiva"],
    communicationModes: ["Língua Portuguesa escrita"],
    autonomyLevel: "moderate",
    responseModes: ["Seleção", "Texto"],
  });
  assert.equal(result.structure.materialType, "study_material");
  assert.equal(result.structure.sourceQuestionCount, 0);
  assert.equal(result.questions.length, 4);
  assert.equal(result.questions.every((question) => question.source === "generated"), true);
  assert.match(result.taskInstruction, /quatro questões/i);
});

test("atividade existente preserva perguntas e alternativas", () => {
  const original = [
    "ATIVIDADE — Programação",
    "Leia o exemplo e responda.",
    "1. Qual sequência está correta?",
    "A) Início, teste, resultado",
    "B) Resultado, início, teste",
    "C) Teste, resultado, início",
    "2. Explique por que escolheu essa sequência?"
  ].join("\n");

  const result = adaptExistingMaterial({
    title: "Programação",
    originalText: original,
    learnerProfiles: ["Surdez"],
    supportNeeds: ["Apoio visual"],
    communicationModes: ["Língua Portuguesa escrita"],
    autonomyLevel: "moderate",
    responseModes: ["Seleção", "Texto"],
  });

  assert.equal(result.structure.materialType, "activity");
  assert.equal(result.structure.sourceQuestionCount, 2);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].type, "multiple_choice");
  assert.deepEqual(result.questions[0].options, ["Início, teste, resultado", "Resultado, início, teste", "Teste, resultado, início"]);
  assert.equal(result.questions.every((question) => question.source === "original"), true);
});
