import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { canSeeAllTenants, getSession } from "@/lib/auth";
import { mutateDb, readDb } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const db = readDb();
  const practices = canSeeAllTenants(session.role)
    ? db.practices
    : db.practices.filter((p) => p.tenantId === session.tenantId);
  const outputs = db.outputs;
  return NextResponse.json({
    practices: practices.map((p) => ({
      ...p,
      tenantName: db.tenants.find((t) => t.id === p.tenantId)?.name,
      documents: db.documents.filter((d) => d.practiceId === p.id).length,
      outputs: outputs.filter((o) => o.practiceId === p.id).length,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const body = (await req.json()) as {
    title?: string;
    ente?: string;
    cig?: string;
    notes?: string;
    promptId?: string;
    extraInstruction?: string;
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const practice = mutateDb((db) => {
    const prompt =
      db.prompts.find((p) => p.id === body.promptId) ??
      db.prompts.find((p) => p.tenantId === session.tenantId && p.isDefault) ??
      db.prompts[0];
    const row = {
      id: uuid(),
      tenantId: session.tenantId,
      title: body.title!.trim(),
      ente: body.ente?.trim() ?? "",
      cig: body.cig?.trim() ?? "",
      notes: body.notes?.trim() ?? "",
      promptId: prompt?.id ?? "",
      extraInstruction: body.extraInstruction?.trim() ?? "",
      status: "draft" as const,
      createdBy: session.id,
      createdAt: now,
      updatedAt: now,
    };
    db.practices.push(row);
    return row;
  });
  return NextResponse.json({ practice });
}
