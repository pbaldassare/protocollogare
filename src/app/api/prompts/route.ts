import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { canSeeAllTenants, getSession } from "@/lib/auth";
import { DEFAULT_SECTIONS } from "@/lib/seed";
import { mutateDb, readDb } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const db = readDb();
  const prompts = canSeeAllTenants(session.role)
    ? db.prompts
    : db.prompts.filter((p) => p.tenantId === session.tenantId || p.tenantId === "tenant-idguard");
  return NextResponse.json({ prompts });
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
  const prompt = mutateDb((db) => {
    const source = body.cloneId ? db.prompts.find((p) => p.id === body.cloneId) : null;
    const row = {
      id: uuid(),
      tenantId: session.tenantId,
      name: body.name?.trim() || source?.name || "Nuovo formato",
      description: body.description?.trim() || source?.description || "",
      body: body.body?.trim() || source?.body || "Istruisci l'IA: ruolo, principi, documenti, formato.",
      sections: source?.sections ?? DEFAULT_SECTIONS,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };
    db.prompts.push(row);
    return row;
  });
  return NextResponse.json({ prompt });
}
