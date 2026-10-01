export const canonicalComponents = [
  "Tecnologia e Inovação",
  "Programação",
  "Robótica",
] as const;

export const schoolYearOrder = [
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
  "1ª série EM",
  "2ª série EM",
  "3ª série EM",
] as const;

export function normalizeSchoolYear(value: string | null | undefined) {
  if (!value) return "";
  const normalized = value.trim();
  if (normalized === "1ª série") return "1ª série EM";
  if (normalized === "2ª série") return "2ª série EM";
  if (normalized === "3ª série") return "3ª série EM";
  return normalized;
}

export function sortSchoolYears(a: string, b: string) {
  const ai = schoolYearOrder.indexOf(a as (typeof schoolYearOrder)[number]);
  const bi = schoolYearOrder.indexOf(b as (typeof schoolYearOrder)[number]);
  if (ai === -1 && bi === -1) return a.localeCompare(b, "pt-BR");
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

export function curriculumDomain(component: string) {
  if (component === "Programação") return "programming";
  if (component === "Robótica") return "robotics";
  return "digital_tools";
}
