import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractTextFromFile } from "@/lib/extract";
import { deleteDocument, getPractice, insertDocument } from "@/lib/store";
import type { DocumentKind } from "@/lib/types";
import { inWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

function visible(tenantId: string, session: Parameters<typeof inWorkspace>[0]) {
  return inWorkspace(session, tenantId);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const practice = await getPractice(id);
  if (!practice || !visible(practice.tenantId, session)) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "altro") as DocumentKind;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = mkdtempSync(path.join(tmpdir(), "pgare-"));
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

  const doc = await insertDocument({
    tenantId: practice.tenantId,
    practiceId: practice.id,
    kind,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    extractedText,
    fileBytes: bytes,
  });

  return NextResponse.json({
    document: doc ? { ...doc, extractedText: doc.extractedText.slice(0, 4000) } : null,
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const practice = await getPractice(id);
  if (!practice || !visible(practice.tenantId, session)) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }
  const docId = new URL(req.url).searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId mancante" }, { status: 400 });
  const ok = await deleteDocument(id, docId);
  if (!ok) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
