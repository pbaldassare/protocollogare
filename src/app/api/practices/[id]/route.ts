import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPractice,
  listDocuments,
  listOutputs,
  listPrompts,
  listVersionsForPractice,
  updatePractice,
} from "@/lib/store";
import { inWorkspace } from "@/lib/workspace";

function visible(tenantId: string, session: Parameters<typeof inWorkspace>[0]) {
  return inWorkspace(session, tenantId);
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const practice = await getPractice(id);
  if (!practice || !visible(practice.tenantId, session)) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }
  const [documents, outputs, prompts, versions] = await Promise.all([
    listDocuments(id),
    listOutputs(id),
    listPrompts(session),
    listVersionsForPractice(id),
  ]);
  return NextResponse.json({ practice, documents, outputs, prompts, versions });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const current = await getPractice(id);
  if (!current || !visible(current.tenantId, session)) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }
  const body = (await req.json()) as Record<string, string>;
  const practice = await updatePractice(id, {
    title: body.title,
    ente: body.ente,
    cig: body.cig,
    notes: body.notes,
    promptId: body.promptId,
    extraInstruction: body.extraInstruction,
    status: body.status as "draft" | "ready" | "generated" | "archived" | undefined,
  });
  return NextResponse.json({ practice });
}
