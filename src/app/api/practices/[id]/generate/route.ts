import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateOutput } from "@/lib/generate";
import {
  getPractice,
  getPrompt,
  listDocuments,
  listKnowledgeForGenerate,
  listMemories,
  updatePractice,
  upsertGeneratedOutput,
} from "@/lib/store";
import { inWorkspace, workspaceName } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

function visible(tenantId: string, session: Parameters<typeof inWorkspace>[0]) {
  return inWorkspace(session, tenantId);
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

  if (prompt.tenantId !== practice.tenantId) {
    return NextResponse.json({ error: "Prompt di un altro cliente" }, { status: 400 });
  }

  const extra = body.extraInstruction ?? practice.extraInstruction;
  practice.extraInstruction = extra;
  await updatePractice(id, { extraInstruction: extra });

  try {
    const [knowledge, memories] = await Promise.all([
      listKnowledgeForGenerate(practice.tenantId),
      listMemories(practice.tenantId),
    ]);
    const result = await generateOutput({
      title: practice.title,
      ente: practice.ente,
      cig: practice.cig,
      extraInstruction: extra,
      prompt,
      documents,
      knowledge,
      memories,
      clientName: workspaceName(session),
    });

    const output = await upsertGeneratedOutput({
      practice,
      promptId: prompt.id,
      title: `Output — ${practice.title}`,
      body: result.text,
      model: result.model,
    });

    return NextResponse.json({ output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore generazione";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
