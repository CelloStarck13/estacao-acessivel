import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "O arquivo deve ter no máximo 10 MB." }, { status: 413 });
    }

    const name = file.name;
    const lower = name.toLowerCase();
    let text = "";

    if (file.type === "text/plain" || lower.endsWith(".txt") || lower.endsWith(".md")) {
      text = await file.text();
    } else if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule.default ?? pdfParseModule) as unknown as (buffer: Buffer) => Promise<{ text?: string }>;
      const result = await pdfParse(Buffer.from(await file.arrayBuffer()));
      text = result.text ?? "";
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) });
      text = result.value ?? "";
    } else {
      return NextResponse.json(
        { error: "Formato ainda não suportado. Use PDF, DOCX, TXT ou MD." },
        { status: 415 },
      );
    }

    const cleaned = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    if (!cleaned) {
      return NextResponse.json(
        { error: "Não foi possível extrair texto deste arquivo. Verifique se ele contém texto selecionável." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      fileName: name,
      mimeType: file.type || "application/octet-stream",
      text: cleaned.slice(0, 120000),
      truncated: cleaned.length > 120000,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o arquivo." }, { status: 500 });
  }
}
