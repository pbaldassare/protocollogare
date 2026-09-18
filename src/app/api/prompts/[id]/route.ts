import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPrompt, updatePrompt } from "@/lib/store";
import type { PromptTemplateSection } from "@/lib/types";
import { inWorkspace } from "@/lib/workspace";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const current = await getPrompt(id);
  if (!current) return NextResponse.json({ error: "Prompt non trovato" }, { status: 404 });
  if (!inWorkspace(session, current.tenantId)) {
    return NextResponse.json({ error: "Prompt non trovato" }, { status: 404 });
  }
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    body?: string;
    sections?: PromptTemplateSection[];
    isDefault?: boolean;
  };
  const prompt = await updatePrompt(id, body);
  return NextResponse.json({ prompt });
}
