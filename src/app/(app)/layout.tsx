import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { readDb } from "@/lib/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  readDb();
  const user = await getSession();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
