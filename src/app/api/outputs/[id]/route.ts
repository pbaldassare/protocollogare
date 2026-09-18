import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOutput, updateOutput } from "@/lib/store";
import { inWorkspace } from "@/lib/workspace";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const current = await getOutput(id);
  if (!current) return NextResponse.json({ error: "Output non trovato" }, { status: 404 });
  if (!inWorkspace(session, current.tenantId)) {
    return NextResponse.json({ error: "Output non trovato" }, { status: 404 });
  }
  const body = (await req.json()) as {
    body?: string;
    status?: "draft" | "review" | "final";
    saveVersion?: boolean;
    note?: string;
  };
  const output = await updateOutput(id, body);
  return NextResponse.json({ output });
}
