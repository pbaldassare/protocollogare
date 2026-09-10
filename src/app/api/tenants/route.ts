import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createTenant, listTenants } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  return NextResponse.json({ tenants: await listTenants(session) });
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
  const tenant = await createTenant(body.name);
  return NextResponse.json({ tenant });
}
