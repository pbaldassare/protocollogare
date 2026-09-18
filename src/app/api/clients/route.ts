import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listClientDirectory } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (session.role !== "platform_admin") {
    return NextResponse.json({ error: "Solo admin di piattaforma" }, { status: 403 });
  }
  return NextResponse.json({ clients: await listClientDirectory(session) });
}
