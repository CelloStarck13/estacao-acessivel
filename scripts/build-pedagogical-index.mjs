import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(execFile);
const projectRoot = process.cwd();
const tempRoot = path.join(projectRoot, "tmp", "curriculum-index");
const outputFile = path.join(projectRoot, "db", "seeds", "pedagogical-index.json");
await mkdir(tempRoot, { recursive: true });
await mkdir(path.dirname(outputFile), { recursive: true });

const localCatalog = path.join(projectRoot, "tmp", "curriculum-catalog.json");
let units;
try {
  units = JSON.parse(await readFile(localCatalog, "utf8"));
} catch {
  const apiUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!apiUrl || !apiKey) throw new Error("Provide tmp/curriculum-catalog.json or Supabase environment variables");
  const response = await fetch(`${apiUrl}/rest/v1/curriculum_material_units?select=material_key,school_year,term,unit,teacher_materials,student_materials,source_name&order=school_year,term,unit`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  units = await response.json();
}

const stopwords = new Set("a ao aos as de da das do dos e em para por com sem um uma uns umas o os que se no na nos nas seu sua seus suas como mais parte aula aulas atividade atividades estudante estudantes professor professores aprendizagem ensino objetivo objetivos habilidade habilidades".split(" "));
const taxonomy = [
  ["media", /m[ií]di|informa[cç][aã]o|redes sociais|autoria/i],
  ["digital_citizenship", /cultura digital|cidadania|seguran[cç]a|prote[cç][aã]o|computação.*sociedade/i],
  ["data", /planilha|dados|simula[cç][aã]o/i],
  ["programming", /programa[cç][aã]o|python|p5|algorit|recurs|fun[cç][oõ]es|listas|ordena/i],
  ["robotics", /rob[oô]|maker|sensor|automa[cç][aã]o/i],
  ["digital_tools", /edi[cç][aã]o de texto|mouse|teclado|p[aá]gina web|flashcard/i],
];

function cleanText(text) {
  return text.replace(/\u0000/g, " ").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

function shortEvidence(text, pattern) {
  const lines = cleanText(text).split("\n").map((line) => line.trim()).filter((line) => line.length >= 20 && line.length <= 220);
  return [...new Set(lines.filter((line) => pattern.test(line)).slice(0, 12))];
}

function linesOf(text) {
  return cleanText(text).split("\n").map((line) => line.trim()).filter(Boolean);
}

function sectionLines(text, startPattern, endPattern, limit = 30) {
  const lines = linesOf(text);
  const start = lines.findIndex((line) => startPattern.test(line));
  if (start < 0) return [];
  const selected = [];
  for (const line of lines.slice(start + 1)) {
    if (endPattern.test(line)) break;
    if (/^\d{1,2}$/.test(line)) continue;
    selected.push(line);
    if (selected.length >= limit) break;
  }
  return selected;
}

function numberedObjectives(text) {
  const section = sectionLines(text, /^objetivos? de aprendizagem/i, /^habilidades|^conte[uú]do program[aá]tico|^aula\b/i, 24);
  const joined = section.join(" ").replace(/\s+/g, " ");
  const matches = [...joined.matchAll(/(?:^|\s)(?:\d{1,2})[.)]?\s*([^;]+(?:;|\.|$))/g)].map((match) => match[1].replace(/[;.]$/, "").trim());
  return [...new Set(matches.filter((value) => value.length >= 15 && value.length <= 260))];
}

function skillStatements(text) {
  const compact = cleanText(text).replace(/\s+/g, " ");
  const matches = [...compact.matchAll(/\(((?:EF|EM|CG|CE)\d{2}[A-Z]{2,5}\d{2})\)\s*([^()]{15,420}?)(?=\s*\((?:EF|EM|CG|CE)\d{2}|\s{2,}|$)/g)];
  return [...new Map(matches.map((match) => [match[1], { code: match[1], description: match[2].trim().replace(/[.;]$/, "") }])).values()].slice(0, 12);
}

function unitSummary(text) {
  const compact = cleanText(text).replace(/\s+/g, " ");
  const match = compact.match(/Nesta unidade,?\s+(.{80,900}?)(?=Tem[aá]tica da unidade|Ferramentas utilizadas|Formato de entrega|Quantidade de aulas|Objetivos? de aprendizagem)/i);
  return match?.[1]?.trim() ?? null;
}

function lessonTopics(text) {
  const lines = linesOf(text);
  const candidates = lines.filter((line) => line.length >= 12 && line.length <= 120 && !/[.!?]$/.test(line) && /algorit|program|dados|m[ií]di|digital|seguran|planilha|texto|fun[cç]|lista|rede|informa[cç]|comput/i.test(line));
  return [...new Set(candidates)].slice(0, 16);
}

function keywords(text, title) {
  const tokens = cleanText(`${title} ${text}`).toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z][a-z0-9]{3,}/g) ?? [];
  const counts = new Map();
  for (const token of tokens) if (!stopwords.has(token)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([word]) => word);
}

function domainFor(title) {
  return taxonomy.find(([, pattern]) => pattern.test(title))?.[0] ?? "computational_thinking";
}

function sourceLinks(unit) {
  return [...(unit.teacher_materials ?? []), ...(unit.student_materials ?? [])].map(({ label, url }) => ({ label, url }));
}

const records = [];
for (let index = 0; index < units.length; index += 1) {
  const unit = units[index];
  const guide = (unit.teacher_materials ?? []).find((item) => /material do professor/i.test(item.label)) ?? unit.teacher_materials?.[0];
  let text = "";
  let extractionStatus = "catalogued";
  if (guide?.url) {
    const pdfPath = path.join(tempRoot, `${index}.pdf`);
    const txtPath = path.join(tempRoot, `${index}.txt`);
    try {
      const pdfResponse = await fetch(guide.url.replace(/^http:/, "https:"));
      if (!pdfResponse.ok) throw new Error(`HTTP ${pdfResponse.status}`);
      await writeFile(pdfPath, Buffer.from(await pdfResponse.arrayBuffer()));
      await exec("pdftotext", ["-layout", pdfPath, txtPath], { maxBuffer: 20 * 1024 * 1024 });
      text = await readFile(txtPath, "utf8");
      extractionStatus = text.trim().length > 200 ? "extracted" : "catalogued";
    } catch (error) {
      extractionStatus = "failed";
      console.error(`Failed ${unit.material_key}: ${error.message}`);
    } finally {
      await rm(pdfPath, { force: true });
      await rm(txtPath, { force: true });
    }
  }
  records.push({
    material_key: unit.material_key,
    component: unit.school_year.includes("série") ? "Programação" : "Tecnologia e Inovação",
    school_year: unit.school_year,
    term: `${unit.term} bimestre`,
    unit_title: unit.unit,
    domain: domainFor(unit.unit),
    source_name: unit.source_name,
    extraction_status: extractionStatus,
    source_document_count: sourceLinks(unit).length,
    source_documents: sourceLinks(unit),
    keywords: keywords(text, unit.unit),
    unit_summary: unitSummary(text),
    learning_objectives: numberedObjectives(text),
    skills: skillStatements(text),
    lesson_topics: lessonTopics(text),
    objective_evidence: shortEvidence(text, /objetiv|aprendiz|habilid|espera-se|compreender|desenvolver/i),
    content_evidence: shortEvidence(text, /conte[uú]do|conceito|tema|programa[cç]|algorit|dados|m[ií]di|digital|seguran[cç]|rob[oô]|planilha/i),
  });
  console.log(`${index + 1}/${units.length} ${extractionStatus} ${unit.material_key}`);
}

await writeFile(outputFile, `${JSON.stringify({ generated_at: new Date().toISOString(), units: records }, null, 2)}\n`);
await rm(tempRoot, { recursive: true, force: true });
console.log(`Wrote ${records.length} units to ${outputFile}`);
