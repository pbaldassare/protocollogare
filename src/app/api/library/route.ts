import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractTextFromFile } from "@/lib/extract";
import { deleteKnowledge, insertKnowledge, listKnowledge } from "@/lib/store";
import type { KnowledgeKind } from "@/lib/types";
import { workspaceId } from "@/lib/workspace";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const items = await listKnowledge(workspaceId(session));
  return NextResponse.json({ documents: items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "altro") as KnowledgeKind;
  const title = String(form.get("title") || "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = mkdtempSync(path.join(tmpdir(), "pgare-lib-"));
  const tmpPath = path.join(dir, file.name.replace(/[^\w.\-]/g, "_") || "upload.bin");
  writeFileSync(tmpPath, bytes);
  let extractedText = "";
  try {
    extractedText = await extractTextFromFile(tmpPath, file.type, file.name);
  } catch (err) {
    extractedText = `⚠ Estrazione fallita: ${err instanceof Error ? err.message : "errore"}`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const document = await insertKnowledge({
    tenantId: workspaceId(session),
    title: title || file.name,
    kind: ["modello", "azienda", "normativa", "altro"].includes(kind) ? kind : "altro",
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    extractedText,
    fileBytes: bytes,
  });
  return NextResponse.json({
    document: document
      ? { ...document, extractedText: document.extractedText.slice(0, 4000) }
      : null,
  });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id mancante" }, { status: 400 });
  const ok = await deleteKnowledge(workspaceId(session), id);
  if (!ok) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
