import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listDocumentTree } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  return NextResponse.json(await listDocumentTree(session));
}
