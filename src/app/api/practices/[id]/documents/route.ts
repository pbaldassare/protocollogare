import { writeFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { extractTextFromFile } from "@/lib/extract";
import { mutateDb, readDb, uploadDir } from "@/lib/store";
import type { DocumentKind } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const db = readDb();
  const practice = db.practices.find((p) => p.id === id);
  if (!practice) return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  if (session.role !== "platform_admin" && practice.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "altro") as DocumentKind;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^\w.\- ()àèéìòù]/gi, "_");
  const dir = uploadDir(practice.tenantId, practice.id);
  const filename = `${Date.now()}-${safe}`;
  const storagePath = path.join(dir, filename);
  writeFileSync(storagePath, bytes);

  let extractedText = "";
  try {
    extractedText = await extractTextFromFile(storagePath, file.type, file.name);
  } catch (err) {
    extractedText = `⚠ Estrazione fallita: ${err instanceof Error ? err.message : "errore"}`;
  }

  const doc = mutateDb((store) => {
    const row = {
      id: uuid(),
      tenantId: practice.tenantId,
      practiceId: practice.id,
      kind,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      storagePath,
      extractedText,
      size: bytes.length,
      createdAt: new Date().toISOString(),
    };
    store.documents.push(row);
    const p = store.practices.find((x) => x.id === practice.id);
    if (p) {
      p.status = p.status === "draft" ? "ready" : p.status;
      p.updatedAt = new Date().toISOString();
    }
    return row;
  });

  return NextResponse.json({ document: { ...doc, extractedText: doc.extractedText.slice(0, 4000) } });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId mancante" }, { status: 400 });
  const ok = mutateDb((db) => {
    const practice = db.practices.find((p) => p.id === id);
    if (!practice) return false;
    if (session.role !== "platform_admin" && practice.tenantId !== session.tenantId) return false;
    const before = db.documents.length;
    db.documents = db.documents.filter((d) => !(d.id === docId && d.practiceId === id));
    return db.documents.length < before;
  });
  if (!ok) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
