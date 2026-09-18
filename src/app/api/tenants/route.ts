import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listTenants, onboardClient } from "@/lib/store";

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
  const body = (await req.json()) as {
    name?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome cliente obbligatorio" }, { status: 400 });
  }
  let adminPasswordHash: string | undefined;
  if (body.adminEmail || body.adminPassword) {
    if (!body.adminEmail?.trim() || !body.adminPassword) {
      return NextResponse.json(
        { error: "Per creare l’admin del cliente servono email e password" },
        { status: 400 },
      );
    }
    if (body.adminPassword.length < 8) {
      return NextResponse.json({ error: "Password di almeno 8 caratteri" }, { status: 400 });
    }
    adminPasswordHash = await hash(body.adminPassword, 12);
  }
  try {
    const created = await onboardClient({
      name: body.name.trim(),
      adminName: body.adminName,
      adminEmail: body.adminEmail,
      adminPasswordHash,
    });
    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore creazione cliente";
    if (message.includes("users_email_key") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
