import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { mutateDb, readDb } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const db = readDb();
  if (session.role !== "platform_admin") {
    return NextResponse.json({
      tenants: db.tenants.filter((t) => t.id === session.tenantId),
    });
  }
  return NextResponse.json({ tenants: db.tenants });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "platform_admin") {
    return NextResponse.json({ error: "Solo admin di piattaforma" }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
  }
  const tenant = mutateDb((db) => {
    const row = {
      id: uuid(),
      name: body.name!.trim(),
      slug: body.name!.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      createdAt: new Date().toISOString(),
    };
    db.tenants.push(row);
    return row;
  });
  return NextResponse.json({ tenant });
}
