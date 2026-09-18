import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteMemory, insertMemory, listMemories } from "@/lib/store";
import type { MemoryKind } from "@/lib/types";
import { workspaceId } from "@/lib/workspace";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  return NextResponse.json({ memories: await listMemories(workspaceId(session)) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const body = (await req.json()) as { kind?: MemoryKind; content?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Testo obbligatorio" }, { status: 400 });
  }
  const kind: MemoryKind =
    body.kind === "style" || body.kind === "correction" ? body.kind : "fact";
  const memory = await insertMemory({
    tenantId: workspaceId(session),
    kind,
    content: body.content,
  });
  return NextResponse.json({ memory });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id mancante" }, { status: 400 });
  const ok = await deleteMemory(workspaceId(session), id);
  if (!ok) return NextResponse.json({ error: "Memoria non trovata" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
