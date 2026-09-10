import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { generateOutput } from "@/lib/generate";
import { mutateDb, readDb } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { extraInstruction?: string };
  const db = readDb();
  const practice = db.practices.find((p) => p.id === id);
  if (!practice) return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  if (session.role !== "platform_admin" && practice.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }
  const prompt = db.prompts.find((p) => p.id === practice.promptId);
  if (!prompt) return NextResponse.json({ error: "Prompt non trovato" }, { status: 400 });
  const documents = db.documents.filter((d) => d.practiceId === id);
  if (!documents.length) {
    return NextResponse.json({ error: "Carica almeno un documento" }, { status: 400 });
  }

  const extra = body.extraInstruction ?? practice.extraInstruction;
  const result = await generateOutput({
    title: practice.title,
    ente: practice.ente,
    cig: practice.cig,
    extraInstruction: extra,
    prompt,
    documents,
  });

  const now = new Date().toISOString();
  const output = mutateDb((store) => {
    const p = store.practices.find((x) => x.id === id)!;
    p.extraInstruction = extra;
    p.status = "generated";
    p.updatedAt = now;
    const existing = store.outputs.find((o) => o.practiceId === id);
    if (existing) {
      store.versions.push({
        id: uuid(),
        outputId: existing.id,
        tenantId: existing.tenantId,
        body: existing.body,
        note: "Versione precedente",
        createdAt: now,
      });
      existing.body = result.text;
      existing.promptId = prompt.id;
      existing.model = result.model;
      existing.status = "draft";
      existing.updatedAt = now;
      existing.title = `Output — ${p.title}`;
      return existing;
    }
    const row = {
      id: uuid(),
      tenantId: p.tenantId,
      practiceId: p.id,
      promptId: prompt.id,
      title: `Output — ${p.title}`,
      body: result.text,
      status: "draft" as const,
      model: result.model,
      createdAt: now,
      updatedAt: now,
    };
    store.outputs.push(row);
    return row;
  });

  return NextResponse.json({ output });
}
