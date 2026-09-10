import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mutateDb } from "@/lib/store";
import type { PromptTemplateSection } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    body?: string;
    sections?: PromptTemplateSection[];
    isDefault?: boolean;
  };
  const prompt = mutateDb((db) => {
    const row = db.prompts.find((p) => p.id === id);
    if (!row) return null;
    if (session.role !== "platform_admin" && row.tenantId !== session.tenantId) return null;
    if (body.name !== undefined) row.name = body.name;
    if (body.description !== undefined) row.description = body.description;
    if (body.body !== undefined) row.body = body.body;
    if (body.sections !== undefined) row.sections = body.sections;
    if (body.isDefault) {
      for (const p of db.prompts) {
        if (p.tenantId === row.tenantId) p.isDefault = p.id === row.id;
      }
    }
    row.updatedAt = new Date().toISOString();
    return row;
  });
  if (!prompt) return NextResponse.json({ error: "Prompt non trovato" }, { status: 404 });
  return NextResponse.json({ prompt });
}
