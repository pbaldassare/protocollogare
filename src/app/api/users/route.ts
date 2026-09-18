import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/store";
import type { Role } from "@/lib/types";
import { isPlatformAdmin, workspaceId } from "@/lib/workspace";

function canManageUsers(session: { role: Role }) {
  return session.role === "platform_admin" || session.role === "admin";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const users = await listUsers(workspaceId(session));
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
  };
  if (!body.email?.trim() || !body.password || !body.name?.trim()) {
    return NextResponse.json({ error: "Nome, email e password obbligatori" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: "Password di almeno 8 caratteri" }, { status: 400 });
  }
  const role: Role = body.role === "admin" || body.role === "viewer" ? body.role : "editor";
  if (role === "admin" && !isPlatformAdmin(session) && session.role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  try {
    const user = await createUser({
      email: body.email,
      name: body.name,
      role,
      tenantId: workspaceId(session),
      passwordHash: await hash(body.password, 12),
    });
    return NextResponse.json({
      user: user
        ? { id: user.id, email: user.email, name: user.name, role: user.role }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore";
    if (message.includes("users_email_key") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
