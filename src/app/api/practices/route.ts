import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createPractice, listPractices } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  return NextResponse.json({ practices: await listPractices(session) });
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
  const practice = await createPractice({
    tenantId: session.tenantId,
    title: body.title.trim(),
    ente: body.ente?.trim() ?? "",
    cig: body.cig?.trim() ?? "",
    notes: body.notes?.trim() ?? "",
    promptId: body.promptId,
    extraInstruction: body.extraInstruction?.trim() ?? "",
    createdBy: session.id,
  });
  return NextResponse.json({ practice });
}
