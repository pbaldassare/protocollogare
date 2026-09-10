import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { mutateDb } from "@/lib/store";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as { body?: string; status?: string; saveVersion?: boolean; note?: string };
  const output = mutateDb((db) => {
    const row = db.outputs.find((o) => o.id === id);
    if (!row) return null;
    if (session.role !== "platform_admin" && row.tenantId !== session.tenantId) return null;
    if (body.saveVersion && body.body !== undefined) {
      db.versions.push({
        id: uuid(),
        outputId: row.id,
        tenantId: row.tenantId,
        body: row.body,
        note: body.note || "Salvataggio manuale",
        createdAt: new Date().toISOString(),
      });
    }
    if (body.body !== undefined) row.body = body.body;
    if (body.status === "draft" || body.status === "review" || body.status === "final") {
      row.status = body.status;
    }
    row.updatedAt = new Date().toISOString();
    return row;
  });
  if (!output) return NextResponse.json({ error: "Output non trovato" }, { status: 404 });
  return NextResponse.json({ output });
}
