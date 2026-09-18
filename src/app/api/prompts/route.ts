import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEFAULT_SECTIONS } from "@/lib/seed";
import { createPrompt, getPrompt, listPrompts } from "@/lib/store";
import { inWorkspace, workspaceId } from "@/lib/workspace";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  return NextResponse.json({ prompts: await listPrompts(session) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    body?: string;
    cloneId?: string;
  };
  const source = body.cloneId ? await getPrompt(body.cloneId) : null;
  if (source && !inWorkspace(session, source.tenantId)) {
    return NextResponse.json({ error: "Prompt non trovato" }, { status: 404 });
  }
  const prompt = await createPrompt({
    tenantId: workspaceId(session),
    name: body.name?.trim() || source?.name || "Nuovo formato",
    description: body.description?.trim() || source?.description || "",
    body: body.body?.trim() || source?.body || "Istruisci l'IA: ruolo, principi, documenti, formato.",
    sections: source?.sections ?? DEFAULT_SECTIONS,
  });
  return NextResponse.json({ prompt });
}
