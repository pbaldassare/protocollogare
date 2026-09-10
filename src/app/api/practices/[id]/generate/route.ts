import { NextResponse } from "next/server";
import { canSeeAllTenants, getSession } from "@/lib/auth";
import { generateOutput } from "@/lib/generate";
import {
  getPractice,
  getPrompt,
  listDocuments,
  updatePractice,
  upsertGeneratedOutput,
} from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

function visible(tenantId: string, session: { tenantId: string; role: string }) {
  return canSeeAllTenants(session.role as "platform_admin") || tenantId === session.tenantId;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { extraInstruction?: string };
  const practice = await getPractice(id);
  if (!practice || !visible(practice.tenantId, session)) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }
  const prompt = await getPrompt(practice.promptId);
  if (!prompt) return NextResponse.json({ error: "Prompt non trovato" }, { status: 400 });
  const documents = await listDocuments(id);
  if (!documents.length) {
    return NextResponse.json({ error: "Carica almeno un documento" }, { status: 400 });
  }

  const extra = body.extraInstruction ?? practice.extraInstruction;
  practice.extraInstruction = extra;
  await updatePractice(id, { extraInstruction: extra });

  const result = await generateOutput({
    title: practice.title,
    ente: practice.ente,
    cig: practice.cig,
    extraInstruction: extra,
    prompt,
    documents,
  });

  const output = await upsertGeneratedOutput({
    practice,
    promptId: prompt.id,
    title: `Output — ${practice.title}`,
    body: result.text,
    model: result.model,
  });

  return NextResponse.json({ output });
}
