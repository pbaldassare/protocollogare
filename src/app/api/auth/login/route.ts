import { NextResponse } from "next/server";
import { createSession, findUserByEmail, toSessionUser, verifyPassword } from "@/lib/auth";
import { readDb } from "@/lib/store";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Inserisci email e password." }, { status: 400 });
  }
  readDb();
  const user = findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Credenziali non valide." }, { status: 401 });
  }
  const session = toSessionUser(user);
  await createSession(session);
  return NextResponse.json({ user: session });
}
