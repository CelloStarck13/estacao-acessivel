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
