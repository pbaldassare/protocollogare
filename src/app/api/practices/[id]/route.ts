import { NextResponse } from "next/server";
import { canSeeAllTenants, getSession } from "@/lib/auth";
import { mutateDb, readDb } from "@/lib/store";

function visible(tenantId: string, sessionTenant: string, role: string) {
  return role === "platform_admin" || tenantId === sessionTenant;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const db = readDb();
  const practice = db.practices.find((p) => p.id === id);
  if (!practice || !visible(practice.tenantId, session.tenantId, session.role)) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  }
  return NextResponse.json({
    practice,
    documents: db.documents.filter((d) => d.practiceId === id),
    outputs: db.outputs.filter((o) => o.practiceId === id),
    prompts: canSeeAllTenants(session.role)
      ? db.prompts
      : db.prompts.filter((p) => p.tenantId === session.tenantId || p.tenantId === "tenant-idguard"),
    versions: db.versions.filter((v) =>
      db.outputs.some((o) => o.practiceId === id && o.id === v.outputId),
    ),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, string>;
  const practice = mutateDb((db) => {
    const row = db.practices.find((p) => p.id === id);
    if (!row || !visible(row.tenantId, session.tenantId, session.role)) return null;
    if (body.title !== undefined) row.title = body.title;
    if (body.ente !== undefined) row.ente = body.ente;
    if (body.cig !== undefined) row.cig = body.cig;
    if (body.notes !== undefined) row.notes = body.notes;
    if (body.promptId !== undefined) row.promptId = body.promptId;
    if (body.extraInstruction !== undefined) row.extraInstruction = body.extraInstruction;
    if (body.status !== undefined) row.status = body.status as typeof row.status;
    row.updatedAt = new Date().toISOString();
    return row;
  });
  if (!practice) return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
  return NextResponse.json({ practice });
}
