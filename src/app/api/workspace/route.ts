import { NextResponse } from "next/server";
import { createSession, getSession, toSessionUser } from "@/lib/auth";
import { findUserByEmail, getTenant } from "@/lib/store";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const body = (await req.json()) as { tenantId?: string };
  const tenantId = body.tenantId?.trim();
  if (!tenantId) return NextResponse.json({ error: "Cliente mancante" }, { status: 400 });

  if (session.role !== "platform_admin" && tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Non puoi entrare in un altro spazio" }, { status: 403 });
  }
  const tenant = await getTenant(tenantId);
  if (!tenant) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  const user = await findUserByEmail(session.email);
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  const next = await toSessionUser(user, tenant.id);
  await createSession(next);
  return NextResponse.json({ user: next });
}
